import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import {
  ACTIVE_EXECUTION_RUN_STATUSES,
  buildPipelineManifest,
  buildStepInputPayload,
  corsHeaders,
  createAdminClient,
  DIAGNOSIS_STEPS,
  jsonResponse,
  normalizeText,
  requireInternalUser,
  resolveOrigin,
} from "../_shared/diagnosis.ts";

type PrepareDiagnosisRunInput = {
  case_id?: string;
  model_provider?: string;
  model_name?: string;
  execution_mode?: string;
};

serve(async (req) => {
  const origin = resolveOrigin(req);
  let supabase: ReturnType<typeof createAdminClient> | null = null;
  let lockedCaseId = "";
  let createdRunId = "";

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin } });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Metodo nao permitido." }, origin);
  }

  try {
    supabase = createAdminClient();
    const auth = await requireInternalUser(req, supabase);
    if ("error" in auth) return auth.error;

    const body = (await req.json().catch(() => ({}))) as PrepareDiagnosisRunInput;
    const caseId = normalizeText(body.case_id);
    const modelProvider = normalizeText(body.model_provider) || "manual";
    const modelName = normalizeText(body.model_name) || "habilis-pipeline-v1";
    const executionMode = normalizeText(body.execution_mode) || "manual";

    if (!caseId) {
      return jsonResponse(400, { error: "case_id e obrigatorio." }, origin);
    }

    const { data: caseRow, error: caseError } = await supabase
      .from("crm_diagnosis_cases")
      .select("*")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError || !caseRow) {
      return jsonResponse(404, { error: "Caso de diagnostico nao encontrado." }, origin);
    }

    if (caseRow.status !== "ready_to_run") {
      return jsonResponse(409, {
        error: "O caso precisa estar com status ready_to_run antes de preparar uma nova execucao.",
      }, origin);
    }

    const { data: lead, error: leadError } = await supabase
      .from("crm_leads_public")
      .select("*")
      .eq("id", caseRow.lead_id)
      .maybeSingle();

    if (leadError || !lead) {
      return jsonResponse(404, { error: "Lead relacionado ao caso nao encontrado." }, origin);
    }

    const { data: latestInput, error: inputError } = await supabase
      .from("crm_diagnosis_inputs")
      .select("*")
      .eq("case_id", caseId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inputError) {
      console.error("prepare-diagnosis-run latest input error", inputError);
      return jsonResponse(500, { error: "Nao foi possivel carregar a entrada do diagnostico." }, origin);
    }

    if (!latestInput) {
      return jsonResponse(409, {
        error: "O caso ainda nao possui entrada estruturada suficiente para abrir uma execucao.",
      }, origin);
    }

    const { data: documents, error: docsError } = await supabase
      .from("crm_diagnosis_documents")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (docsError) {
      console.error("prepare-diagnosis-run documents error", docsError);
      return jsonResponse(500, { error: "Nao foi possivel carregar os documentos do caso." }, origin);
    }

    const { data: latestRun, error: latestRunError } = await supabase
      .from("crm_diagnosis_runs")
      .select("run_number")
      .eq("case_id", caseId)
      .order("run_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRunError) {
      console.error("prepare-diagnosis-run latest run error", latestRunError);
      return jsonResponse(500, { error: "Nao foi possivel calcular a proxima execucao." }, origin);
    }

    const { data: activeRuns, error: activeRunsError } = await supabase
      .from("crm_diagnosis_runs")
      .select("id, run_number, status")
      .eq("case_id", caseId)
      .in("status", [...ACTIVE_EXECUTION_RUN_STATUSES]);

    if (activeRunsError) {
      console.error("prepare-diagnosis-run active runs error", activeRunsError);
      return jsonResponse(500, { error: "Nao foi possivel verificar execucoes ativas do caso." }, origin);
    }

    if ((activeRuns || []).length > 0) {
      return jsonResponse(409, {
        error: "Ja existe uma execucao ativa para este caso. Conclua ou encerre a run atual antes de abrir outra.",
      }, origin);
    }

    const { data: lockedCase, error: lockError } = await supabase
      .from("crm_diagnosis_cases")
      .update({
        status: "running",
        assigned_to: caseRow.assigned_to || auth.user.email,
      })
      .eq("id", caseId)
      .eq("status", "ready_to_run")
      .select("*")
      .maybeSingle();

    if (lockError) {
      console.error("prepare-diagnosis-run case lock error", lockError);
      return jsonResponse(500, { error: "Nao foi possivel reservar o caso para execucao." }, origin);
    }

    if (!lockedCase) {
      return jsonResponse(409, {
        error: "O caso mudou de estado antes da abertura da execucao. Atualize a fila e tente novamente.",
      }, origin);
    }
    lockedCaseId = caseId;

    const runNumber = Number(latestRun?.run_number || 0) + 1;
    const pipelineManifest = buildPipelineManifest({
      lead,
      caseRow: lockedCase,
      inputRow: latestInput,
      documents: documents || [],
      executionMode,
      modelProvider,
      modelName,
    });

    const { data: run, error: runError } = await supabase
      .from("crm_diagnosis_runs")
      .insert([{
        case_id: caseId,
        run_number: runNumber,
        status: "running_agent_01",
        started_at: new Date().toISOString(),
        model_provider: modelProvider,
        model_name: modelName,
        execution_mode: executionMode,
        created_by_email: auth.user.email,
        pipeline_manifest: pipelineManifest,
      }])
      .select("*")
      .single();

    if (runError || !run) {
      console.error("prepare-diagnosis-run insert run error", runError);
      await supabase
        .from("crm_diagnosis_cases")
        .update({ status: "ready_to_run" })
        .eq("id", caseId);
      lockedCaseId = "";
      return jsonResponse(500, { error: "Nao foi possivel criar a execucao do diagnostico." }, origin);
    }
    createdRunId = run.id;

    const stepsPayload = DIAGNOSIS_STEPS.map((step) => ({
      run_id: run.id,
      step_order: step.order,
      step_code: step.code,
      agent_name: step.agentName,
      status: step.code === "agent_01" ? "running" : "pending",
      prompt_snapshot: `${step.promptSourceRef} :: ${step.summary}`,
      input_payload: buildStepInputPayload(step, pipelineManifest),
      started_at: step.code === "agent_01" ? new Date().toISOString() : null,
    }));

    const { data: steps, error: stepsError } = await supabase
      .from("crm_diagnosis_run_steps")
      .insert(stepsPayload)
      .select("*");

    if (stepsError || !steps) {
      console.error("prepare-diagnosis-run insert steps error", stepsError);
      await supabase.from("crm_diagnosis_runs").delete().eq("id", run.id);
      createdRunId = "";
      await supabase
        .from("crm_diagnosis_cases")
        .update({ status: "ready_to_run" })
        .eq("id", caseId);
      lockedCaseId = "";
      return jsonResponse(500, { error: "Execucao criada, mas as etapas falharam ao ser registradas." }, origin);
    }

    const { error: caseLinkError } = await supabase
      .from("crm_diagnosis_cases")
      .update({
        current_run_id: run.id,
      })
      .eq("id", caseId);

    if (caseLinkError) {
      console.error("prepare-diagnosis-run link case error", caseLinkError);
      await supabase.from("crm_diagnosis_run_steps").delete().eq("run_id", run.id);
      await supabase.from("crm_diagnosis_runs").delete().eq("id", run.id);
      createdRunId = "";
      await supabase
        .from("crm_diagnosis_cases")
        .update({ status: "ready_to_run" })
        .eq("id", caseId);
      lockedCaseId = "";
      return jsonResponse(500, { error: "Execucao criada, mas o caso nao conseguiu ser vinculado corretamente." }, origin);
    }

    lockedCaseId = "";
    createdRunId = "";

    return jsonResponse(200, {
      ok: true,
      run,
      steps,
      manifest: pipelineManifest,
    }, origin);
  } catch (error) {
    console.error("prepare-diagnosis-run unexpected error", error);
    if (supabase && createdRunId) {
      await supabase.from("crm_diagnosis_run_steps").delete().eq("run_id", createdRunId);
      await supabase.from("crm_diagnosis_runs").delete().eq("id", createdRunId);
    }
    if (supabase && lockedCaseId) {
      await supabase
        .from("crm_diagnosis_cases")
        .update({ status: "ready_to_run" })
        .eq("id", lockedCaseId);
    }
    return jsonResponse(500, { error: "Erro inesperado ao preparar a execucao do diagnostico." }, origin);
  }
});
