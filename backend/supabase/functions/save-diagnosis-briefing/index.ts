import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import {
  corsHeaders,
  createAdminClient,
  jsonResponse,
  normalizeText,
  requireInternalUser,
  resolveOrigin,
} from "../_shared/diagnosis.ts";

type SaveDiagnosisBriefingInput = {
  case_id?: string;
  priority?: string;
  assigned_to?: string | null;
  briefing_summary?: string | null;
  theme?: string | null;
  territorial_scope?: string | null;
  declared_need?: string | null;
  customer_context?: string | null;
  known_constraints?: string | null;
  qualification_questionnaire?: Record<string, unknown> | null;
};

function extractObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

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

    const body = (await req.json().catch(() => ({}))) as SaveDiagnosisBriefingInput;
    const caseId = normalizeText(body.case_id);

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

    if (["approved", "archived"].includes(String(caseRow.status || "").trim().toLowerCase())) {
      return jsonResponse(409, {
        error: "Casos aprovados ou arquivados nao podem ter briefing alterado por esta operacao.",
      }, origin);
    }

    const nextPriority = normalizeText(body.priority) || caseRow.priority || "normal";
    const nextAssignedTo = normalizeText(body.assigned_to) || null;
    const nextBriefingSummary = normalizeText(body.briefing_summary) || null;

    const { data: updatedCase, error: updateCaseError } = await supabase
      .from("crm_diagnosis_cases")
      .update({
        priority: nextPriority,
        assigned_to: nextAssignedTo,
        briefing_summary: nextBriefingSummary,
      })
      .eq("id", caseId)
      .select("*")
      .single();

    if (updateCaseError || !updatedCase) {
      console.error("save-diagnosis-briefing case update error", updateCaseError);
      return jsonResponse(500, { error: "Nao foi possivel atualizar o caso de diagnostico." }, origin);
    }

    const { data: latestInput, error: latestInputError } = await supabase
      .from("crm_diagnosis_inputs")
      .select("*")
      .eq("case_id", caseId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestInputError) {
      console.error("save-diagnosis-briefing latest input error", latestInputError);
      return jsonResponse(500, { error: "Nao foi possivel carregar a entrada atual do diagnostico." }, origin);
    }

    let updatedInput = latestInput || null;
    if (latestInput?.id) {
      const currentPayload = extractObject(latestInput.json_payload);
      const hasQualificationQuestionnaire = Object.prototype.hasOwnProperty.call(
        body,
        "qualification_questionnaire",
      );
      const qualificationQuestionnaire = extractObject(body.qualification_questionnaire);
      const nextPayload = hasQualificationQuestionnaire
        ? {
          ...currentPayload,
          qualification_questionnaire: qualificationQuestionnaire,
        }
        : currentPayload;

      const { data: nextInput, error: updateInputError } = await supabase
        .from("crm_diagnosis_inputs")
        .update({
          theme: normalizeText(body.theme) || null,
          territorial_scope: normalizeText(body.territorial_scope) || null,
          declared_need: normalizeText(body.declared_need) || null,
          customer_context: normalizeText(body.customer_context) || null,
          known_constraints: normalizeText(body.known_constraints) || null,
          json_payload: nextPayload,
        })
        .eq("id", latestInput.id)
        .select("*")
        .single();

      if (updateInputError || !nextInput) {
        console.error("save-diagnosis-briefing input update error", updateInputError);
        await supabase
          .from("crm_diagnosis_cases")
          .update({
            priority: caseRow.priority,
            assigned_to: caseRow.assigned_to,
            briefing_summary: caseRow.briefing_summary,
          })
          .eq("id", caseId);
        return jsonResponse(500, { error: "Nao foi possivel atualizar a entrada estruturada do diagnostico." }, origin);
      }

      updatedInput = nextInput;
    }

    return jsonResponse(200, {
      ok: true,
      case: updatedCase,
      input: updatedInput,
      saved_by: auth.user.email,
    }, origin);
  } catch (error) {
    console.error("save-diagnosis-briefing unexpected error", error);
    return jsonResponse(500, { error: "Erro inesperado ao salvar o briefing do diagnostico." }, origin);
  }
});
