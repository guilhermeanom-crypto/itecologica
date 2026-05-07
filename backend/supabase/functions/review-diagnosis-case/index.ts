import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import {
  corsHeaders,
  createAdminClient,
  jsonResponse,
  normalizeText,
  requireInternalUser,
  resolveOrigin,
} from "../_shared/diagnosis.ts";

type ReviewDiagnosisCaseInput = {
  case_id?: string;
  action?: "approve" | "reject" | "reopen";
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

    const body = (await req.json().catch(() => ({}))) as ReviewDiagnosisCaseInput;
    const caseId = normalizeText(body.case_id);
    const action = normalizeText(body.action) as ReviewDiagnosisCaseInput["action"];

    if (!caseId || !action) {
      return jsonResponse(400, { error: "case_id e action sao obrigatorios." }, origin);
    }

    if (!["approve", "reject", "reopen"].includes(action)) {
      return jsonResponse(400, { error: "action invalida para revisao do caso." }, origin);
    }

    const { data: caseRow, error: caseError } = await supabase
      .from("crm_diagnosis_cases")
      .select("*")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError || !caseRow) {
      return jsonResponse(404, { error: "Caso de diagnostico nao encontrado." }, origin);
    }

    const normalizedStatus = String(caseRow.status || "").trim().toLowerCase();
    if (action === "approve" || action === "reject") {
      if (normalizedStatus !== "awaiting_human_review") {
        return jsonResponse(409, {
          error: "Somente casos aguardando revisao humana podem ser aprovados ou rejeitados.",
        }, origin);
      }
    }

    if (action === "reopen" && !["approved", "rejected", "awaiting_human_review"].includes(normalizedStatus)) {
      return jsonResponse(409, {
        error: "Somente casos aprovados, rejeitados ou aguardando revisao podem ser reabertos.",
      }, origin);
    }

    const now = new Date().toISOString();
    let casePatch: Record<string, unknown>;
    let runPatch: Record<string, unknown> | null = null;
    let previousRunState: { status: string | null; finished_at: string | null; error_message: string | null } | null = null;

    if (action === "approve") {
      casePatch = {
        status: "approved",
        approved_at: now,
        approved_by_email: auth.user.email,
        rejected_at: null,
        rejected_by_email: null,
      };
      runPatch = { status: "completed", finished_at: now, error_message: null };
    } else if (action === "reject") {
      casePatch = {
        status: "rejected",
        approved_at: null,
        approved_by_email: null,
        rejected_at: now,
        rejected_by_email: auth.user.email,
      };
      runPatch = { status: "failed", finished_at: now };
    } else {
      casePatch = {
        status: "ready_to_run",
        approved_at: null,
        approved_by_email: null,
        rejected_at: null,
        rejected_by_email: null,
      };
      runPatch = null;
    }

    let updatedRun = null;
    if (runPatch && caseRow.current_run_id) {
      const { data: currentRun, error: currentRunError } = await supabase
        .from("crm_diagnosis_runs")
        .select("status, finished_at, error_message")
        .eq("id", caseRow.current_run_id)
        .maybeSingle();

      if (currentRunError || !currentRun) {
        console.error("review-diagnosis-case current run load error", currentRunError);
        return jsonResponse(500, { error: "Nao foi possivel carregar a execucao atual para revisar o caso." }, origin);
      }
      previousRunState = currentRun;

      const { data: nextRun, error: updateRunError } = await supabase
        .from("crm_diagnosis_runs")
        .update(runPatch)
        .eq("id", caseRow.current_run_id)
        .select("*")
        .maybeSingle();

      if (updateRunError) {
        console.error("review-diagnosis-case run update error", updateRunError);
        return jsonResponse(500, { error: "A revisao do caso falhou ao sincronizar a execucao atual." }, origin);
      }

      updatedRun = nextRun || null;
    }

    const { data: updatedCase, error: updateCaseError } = await supabase
      .from("crm_diagnosis_cases")
      .update(casePatch)
      .eq("id", caseId)
      .select("*")
      .single();

    if (updateCaseError || !updatedCase) {
      console.error("review-diagnosis-case case update error", updateCaseError);
      if (caseRow.current_run_id && previousRunState) {
        await supabase
          .from("crm_diagnosis_runs")
          .update({
            status: previousRunState.status,
            finished_at: previousRunState.finished_at,
            error_message: previousRunState.error_message,
          })
          .eq("id", caseRow.current_run_id);
      }
      return jsonResponse(500, { error: "Nao foi possivel concluir a revisao do caso." }, origin);
    }

    return jsonResponse(200, {
      ok: true,
      case: updatedCase,
      run: updatedRun,
      reviewed_by: auth.user.email,
      action,
    }, origin);
  } catch (error) {
    console.error("review-diagnosis-case unexpected error", error);
    return jsonResponse(500, { error: "Erro inesperado ao revisar o caso de diagnostico." }, origin);
  }
});
