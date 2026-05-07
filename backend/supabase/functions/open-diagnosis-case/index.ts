import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import {
  buildDiagnosisTitle,
  corsHeaders,
  createAdminClient,
  jsonResponse,
  normalizeText,
  requireInternalUser,
  resolveOrigin,
} from "../_shared/diagnosis.ts";

type OpenDiagnosisCaseInput = {
  lead_id?: string;
  diagnosis_type?: string;
  title?: string;
  priority?: string;
  briefing_summary?: string;
  theme?: string;
  territorial_scope?: string;
  customer_context?: string;
  declared_need?: string;
  known_constraints?: string;
  json_payload?: Record<string, unknown>;
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

    const body = (await req.json().catch(() => ({}))) as OpenDiagnosisCaseInput;
    const leadId = normalizeText(body.lead_id);
    const diagnosisType = normalizeText(body.diagnosis_type);

    if (!leadId || !diagnosisType) {
      return jsonResponse(400, { error: "lead_id e diagnosis_type sao obrigatorios." }, origin);
    }

    const { data: lead, error: leadError } = await supabase
      .from("crm_leads_public")
      .select("id, company, city, state, need, notes, qualification_status")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return jsonResponse(404, { error: "Lead nao encontrado." }, origin);
    }

    const title = normalizeText(body.title) || buildDiagnosisTitle(
      diagnosisType,
      normalizeText(lead.company),
      normalizeText(lead.city),
      normalizeText(lead.state),
    );

    const priority = normalizeText(body.priority) || "normal";
    const briefingSummary = normalizeText(body.briefing_summary);

    const { data: existingCase, error: existingCaseError } = await supabase
      .from("crm_diagnosis_cases")
      .select("*")
      .eq("lead_id", leadId)
      .eq("diagnosis_type", diagnosisType)
      .neq("status", "archived")
      .neq("status", "rejected")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingCaseError) {
      console.error("open-diagnosis-case existing case error", existingCaseError);
      return jsonResponse(500, { error: "Nao foi possivel verificar casos existentes para este lead." }, origin);
    }

    if (existingCase) {
      const { data: existingInput, error: existingInputError } = await supabase
        .from("crm_diagnosis_inputs")
        .select("*")
        .eq("case_id", existingCase.id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingInputError) {
        console.error("open-diagnosis-case existing input error", existingInputError);
      }

      await supabase
        .from("crm_leads_public")
        .update({
          qualification_status: "diagnostico_aberto",
          status: "em_diagnostico",
        })
        .eq("id", leadId);

      return jsonResponse(200, {
        ok: true,
        existing_case: true,
        case: existingCase,
        input: existingInput || null,
      }, origin);
    }

    const { data: insertedCase, error: caseError } = await supabase
      .from("crm_diagnosis_cases")
      .insert([{
        lead_id: leadId,
        diagnosis_type: diagnosisType,
        title,
        priority,
        briefing_summary: briefingSummary || null,
        requested_by_email: auth.user.email,
        status: "collecting_inputs",
      }])
      .select("*")
      .single();

    if (caseError || !insertedCase) {
      console.error("open-diagnosis-case insert case error", caseError);
      return jsonResponse(500, { error: "Nao foi possivel abrir o caso de diagnostico." }, origin);
    }

    const inputPayload = {
      lead_company: lead.company,
      lead_need: lead.need,
      lead_notes: lead.notes,
      ...(body.json_payload || {}),
    };

    const { data: insertedInput, error: inputError } = await supabase
      .from("crm_diagnosis_inputs")
      .insert([{
        case_id: insertedCase.id,
        version_number: 1,
        theme: normalizeText(body.theme) || diagnosisType,
        territorial_scope: normalizeText(body.territorial_scope) || [lead.city, lead.state].filter(Boolean).join("/"),
        customer_context: normalizeText(body.customer_context) || null,
        declared_need: normalizeText(body.declared_need) || normalizeText(lead.need) || null,
        known_constraints: normalizeText(body.known_constraints) || null,
        json_payload: inputPayload,
        created_by_email: auth.user.email,
      }])
      .select("*")
      .single();

    if (inputError || !insertedInput) {
      console.error("open-diagnosis-case insert input error", inputError);
      await supabase.from("crm_diagnosis_cases").delete().eq("id", insertedCase.id);
      return jsonResponse(500, { error: "Caso aberto, mas a entrada estruturada falhou." }, origin);
    }

    await supabase
      .from("crm_leads_public")
      .update({
        qualification_status: "diagnostico_aberto",
        status: "em_diagnostico",
      })
      .eq("id", leadId);

    return jsonResponse(200, {
      ok: true,
      case: insertedCase,
      input: insertedInput,
    }, origin);
  } catch (error) {
    console.error("open-diagnosis-case unexpected error", error);
    return jsonResponse(500, { error: "Erro inesperado ao abrir caso de diagnostico." }, origin);
  }
});
