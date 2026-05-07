import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import {
  FINISHED_STEP_STATUSES,
  corsHeaders,
  createAdminClient,
  deriveRunStatusFromSteps,
  jsonResponse,
  mergeDiagnosisOutputs,
  normalizeText,
  requireInternalUser,
  resolveOrigin,
} from "../_shared/diagnosis.ts";

type IngestDiagnosisStepOutputInput = {
  run_id?: string;
  step_code?: string;
  output_payload?: Record<string, unknown>;
  status?: "completed" | "failed" | "skipped";
  error_message?: string;
};

serve(async (req) => {
  const origin = resolveOrigin(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin } });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Metodo nao permitido." }, origin);
  }

  try {
    const supabase = createAdminClient();
    const auth = await requireInternalUser(req, supabase);
    if ("error" in auth) return auth.error;

    const body = (await req.json().catch(() => ({}))) as IngestDiagnosisStepOutputInput;
    const runId = normalizeText(body.run_id);
    const stepCode = normalizeText(body.step_code);
    const nextStatus = body.status || "completed";
    const now = new Date().toISOString();
    const allowedNextStatuses = new Set(["completed", "failed", "skipped"]);

    if (!runId || !stepCode) {
      return jsonResponse(400, { error: "run_id e step_code sao obrigatorios." }, origin);
    }

    if (!allowedNextStatuses.has(nextStatus)) {
      return jsonResponse(400, { error: "status invalido para registro de etapa." }, origin);
    }

    const { data: run, error: runError } = await supabase
      .from("crm_diagnosis_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();

    if (runError || !run) {
      return jsonResponse(404, { error: "Execucao de diagnostico nao encontrada." }, origin);
    }

    const { data: caseRow, error: caseError } = await supabase
      .from("crm_diagnosis_cases")
      .select("id, status, current_run_id")
      .eq("id", run.case_id)
      .maybeSingle();

    if (caseError || !caseRow) {
      return jsonResponse(404, { error: "Caso relacionado a execucao nao encontrado." }, origin);
    }

    if (caseRow.current_run_id !== runId) {
      return jsonResponse(409, {
        error: "Esta execucao nao e mais a run corrente do caso. Atualize a fila antes de registrar novas etapas.",
      }, origin);
    }

    const { data: currentSteps, error: currentStepsError } = await supabase
      .from("crm_diagnosis_run_steps")
      .select("*")
      .eq("run_id", runId)
      .order("step_order", { ascending: true });

    if (currentStepsError || !currentSteps) {
      console.error("ingest-diagnosis-step-output reload steps error", currentStepsError);
      return jsonResponse(500, { error: "Nao foi possivel reavaliar o pipeline." }, origin);
    }

    const { data: targetStep, error: targetStepError } = await supabase
      .from("crm_diagnosis_run_steps")
      .select("*")
      .eq("run_id", runId)
      .eq("step_code", stepCode)
      .maybeSingle();

    if (targetStepError || !targetStep) {
      return jsonResponse(404, { error: "Etapa do diagnostico nao encontrada." }, origin);
    }

    const runningStep = currentSteps.find((step) => step.status === "running") || null;
    if (!runningStep) {
      return jsonResponse(409, {
        error: "Nao existe etapa ativa para receber saida nesta execucao.",
      }, origin);
    }

    if (runningStep.step_code !== stepCode) {
      return jsonResponse(409, {
        error: `A etapa ativa desta execucao e ${runningStep.step_code}. Registre a saida dela antes de avancar o pipeline.`,
      }, origin);
    }

    if (targetStep.status !== "running") {
      return jsonResponse(409, {
        error: "Somente etapas em running podem receber nova saida.",
      }, origin);
    }

    const blockingPreviousStep = currentSteps.find((step) =>
      Number(step.step_order) < Number(targetStep.step_order)
      && !FINISHED_STEP_STATUSES.includes(step.status as "completed" | "skipped"),
    );

    if (blockingPreviousStep) {
      return jsonResponse(409, {
        error: `A etapa ${blockingPreviousStep.step_code} ainda nao foi encerrada corretamente.`,
      }, origin);
    }

    const outputPayload = body.output_payload || {};
    const { data: updatedStep, error: updateStepError } = await supabase
      .from("crm_diagnosis_run_steps")
      .update({
        status: nextStatus,
        output_payload: outputPayload,
        error_message: nextStatus === "failed" ? normalizeText(body.error_message) || "Etapa reportou falha." : null,
        started_at: targetStep.started_at || now,
        finished_at: nextStatus === "completed" || nextStatus === "failed" || nextStatus === "skipped" ? now : null,
      })
      .eq("id", targetStep.id)
      .select("*")
      .single();

    if (updateStepError || !updatedStep) {
      console.error("ingest-diagnosis-step-output update step error", updateStepError);
      return jsonResponse(500, { error: "Nao foi possivel registrar a saida da etapa." }, origin);
    }

    if (nextStatus === "completed" || nextStatus === "skipped") {
      const nextStep = currentSteps.find((step) =>
        Number(step.step_order) > Number(targetStep.step_order)
        && step.status === "pending",
      );
      if (nextStep) {
        await supabase
          .from("crm_diagnosis_run_steps")
          .update({
            status: "running",
            started_at: nextStep.started_at || now,
          })
          .eq("id", nextStep.id);
      }
    }

    const { data: refreshedSteps, error: refreshedStepsError } = await supabase
      .from("crm_diagnosis_run_steps")
      .select("*")
      .eq("run_id", runId)
      .order("step_order", { ascending: true });

    if (refreshedStepsError || !refreshedSteps) {
      console.error("ingest-diagnosis-step-output refresh steps error", refreshedStepsError);
      return jsonResponse(500, { error: "Nao foi possivel consolidar o estado do pipeline." }, origin);
    }

    const allCompleted = refreshedSteps.every((step) =>
      FINISHED_STEP_STATUSES.includes(step.status as "completed" | "skipped"),
    );
    const anyFailed = refreshedSteps.some((step) => step.status === "failed");
    const runStatus = deriveRunStatusFromSteps(refreshedSteps as Array<Record<string, unknown>>);

    let finalOutput = run.final_output || {};
    if (allCompleted) {
      const stepOutputs = Object.fromEntries(
        refreshedSteps.map((step) => [step.step_code, step.output_payload || {}]),
      ) as Record<string, Record<string, unknown>>;
      finalOutput = mergeDiagnosisOutputs(stepOutputs);
    }

    const runUpdate: Record<string, unknown> = {
      status: runStatus,
      error_message: anyFailed ? normalizeText(body.error_message) || "Uma ou mais etapas falharam." : null,
      final_output: finalOutput,
    };

    if (allCompleted || anyFailed) {
      runUpdate.finished_at = now;
    }

    const { data: updatedRun, error: updatedRunError } = await supabase
      .from("crm_diagnosis_runs")
      .update(runUpdate)
      .eq("id", runId)
      .select("*")
      .single();

    if (updatedRunError || !updatedRun) {
      console.error("ingest-diagnosis-step-output update run error", updatedRunError);
      return jsonResponse(500, { error: "Nao foi possivel atualizar a execucao do diagnostico." }, origin);
    }

    const caseStatus = allCompleted
      ? "awaiting_human_review"
      : anyFailed
      ? "ready_to_run"
      : "running";

    await supabase
      .from("crm_diagnosis_cases")
      .update({
        status: caseStatus,
      })
      .eq("id", run.case_id);

    return jsonResponse(200, {
      ok: true,
      step: updatedStep,
      run: updatedRun,
      steps: refreshedSteps,
      final_output: finalOutput,
      recorded_by: auth.user.email,
    }, origin);
  } catch (error) {
    console.error("ingest-diagnosis-step-output unexpected error", error);
    return jsonResponse(500, { error: "Erro inesperado ao registrar a saida da etapa." }, origin);
  }
});
