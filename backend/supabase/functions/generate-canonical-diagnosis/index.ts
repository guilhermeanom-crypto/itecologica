import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import {
  buildCanonicalDiagnosisPayload,
  buildOfficialDiagnosticResult,
  buildOfficialExecutionPlan,
  buildStandaloneDiagnosisSeed,
  type CanonicalDiagnosisSource,
  type DiagnosticAnswers,
} from "../_shared/official-diagnostic.ts";
import {
  corsHeaders,
  createAdminClient,
  extractQualificationQuestionnaire,
  jsonResponse,
  normalizeText,
  requireInternalUser,
  resolveOrigin,
} from "../_shared/diagnosis.ts";

type GenerateCanonicalDiagnosisInput = {
  case_id?: string;
  source?: CanonicalDiagnosisSource;
  answers?: Record<string, unknown>;
  mark_ready?: boolean;
  attach_to_current_run?: boolean;
};

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function coerceAnswers(value: unknown): DiagnosticAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    typeof item === "string" ? item.trim().toLowerCase() : String(item ?? "").trim().toLowerCase(),
  ]);

  return Object.fromEntries(entries);
}

function extractAnswersFromInputPayload(payload: Record<string, unknown>) {
  const directAnswers = coerceAnswers(payload.answers);
  if (Object.keys(directAnswers).length) return directAnswers;

  const characterization = payload.caracterizacao;
  if (characterization && typeof characterization === "object" && !Array.isArray(characterization)) {
    const characterizationAnswers = coerceAnswers(
      (characterization as Record<string, unknown>).answers,
    );
    if (Object.keys(characterizationAnswers).length) return characterizationAnswers;
  }

  const questionnaireAnswers = coerceAnswers(payload.questionnaire_answers);
  if (Object.keys(questionnaireAnswers).length) return questionnaireAnswers;

  return {};
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

    const body = (await req.json().catch(() => ({}))) as GenerateCanonicalDiagnosisInput;
    const caseId = normalizeText(body.case_id);
    const source = (normalizeText(body.source) || "analyst_area") as CanonicalDiagnosisSource;
    const markReady = Boolean(body.mark_ready);
    const attachToCurrentRun = Boolean(body.attach_to_current_run);

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

    if (inputError || !latestInput) {
      console.error("generate-canonical-diagnosis latest input error", inputError);
      return jsonResponse(404, { error: "Entrada estruturada do diagnostico nao encontrada." }, origin);
    }

    const inputPayload = ((latestInput.json_payload as Record<string, unknown> | null) || {});
    const qualificationQuestionnaire = extractQualificationQuestionnaire(inputPayload);
    const answers = {
      ...extractAnswersFromInputPayload(inputPayload),
      ...coerceAnswers(body.answers),
    };

    const seed = buildStandaloneDiagnosisSeed(answers);
    const officialDiagnostic = buildOfficialDiagnosticResult({
      diagnosisType: caseRow.diagnosis_type,
      companyName: cleanText(lead.company) || "Empreendimento",
      clientName: cleanText(lead.name || lead.contact_name) || "Nao informado",
      cnae: cleanText(
        inputPayload.cnae || inputPayload.cnae_principal || qualificationQuestionnaire.cnae,
      ) || "",
      municipality: cleanText(lead.city || inputPayload.municipio) || "",
      state: cleanText(lead.state || inputPayload.estado) || "",
      enterpriseStatus:
        normalizeText(
          String(
            inputPayload.status_emp ||
              inputPayload.enterprise_status ||
              inputPayload.situacao ||
              qualificationQuestionnaire.licenseStatus ||
              "",
          ),
        ) || "nao_informado",
      enterpriseSize: cleanText(inputPayload.porte || inputPayload.enterprise_size) || "",
      declaredNeed: cleanText(latestInput.declared_need || lead.need) || null,
      territorialScope: cleanText(latestInput.territorial_scope) || null,
      knownConstraints: cleanText(latestInput.known_constraints) || null,
      answers,
    });
    const officialExecutionPlan = buildOfficialExecutionPlan(officialDiagnostic);
    const canonicalPayload = buildCanonicalDiagnosisPayload({
      result: seed,
      answers,
      source,
      context: {
        caseId: caseRow.id,
        leadId: caseRow.lead_id,
        runId: attachToCurrentRun ? caseRow.current_run_id || null : null,
        empresaNome: cleanText(lead.company) || "Empreendimento",
        clienteNome: cleanText(lead.name || lead.contact_name) || "Nao informado",
        empresaCnae: cleanText(
          inputPayload.cnae || inputPayload.cnae_principal || qualificationQuestionnaire.cnae,
        ) || "",
        municipio: cleanText(lead.city || inputPayload.municipio) || "",
        estado: cleanText(lead.state || inputPayload.estado) || "",
        statusEmp:
          normalizeText(
            String(
              inputPayload.status_emp ||
                inputPayload.enterprise_status ||
                inputPayload.situacao ||
                qualificationQuestionnaire.licenseStatus ||
                "",
            ),
          ) || "nao_informado",
        porte: cleanText(inputPayload.porte || inputPayload.enterprise_size) || "",
      },
    });

    const artifactRows = [
      {
        case_id: caseRow.id,
        run_id: attachToCurrentRun ? caseRow.current_run_id || null : null,
        artifact_type: "canonical_diagnosis_json",
        mime_type: "application/json",
        metadata: {
          source,
          answer_count: Object.keys(answers).length,
          generated_by: auth.user.email,
          payload: canonicalPayload,
        },
        created_by_email: auth.user.email,
      },
      {
        case_id: caseRow.id,
        run_id: attachToCurrentRun ? caseRow.current_run_id || null : null,
        artifact_type: "official_diagnostic_result_json",
        mime_type: "application/json",
        metadata: {
          source,
          answer_count: Object.keys(answers).length,
          generated_by: auth.user.email,
          payload: officialDiagnostic,
        },
        created_by_email: auth.user.email,
      },
      {
        case_id: caseRow.id,
        run_id: attachToCurrentRun ? caseRow.current_run_id || null : null,
        artifact_type: "official_execution_plan_json",
        mime_type: "application/json",
        metadata: {
          source,
          generated_by: auth.user.email,
          based_on: "official_diagnostic_result_json",
          payload: officialExecutionPlan,
        },
        created_by_email: auth.user.email,
      },
    ];

    const { data: artifacts, error: artifactError } = await supabase
      .from("crm_diagnosis_artifacts")
      .insert(artifactRows)
      .select("*");

    if (artifactError || !artifacts?.length) {
      console.error("generate-canonical-diagnosis artifact error", artifactError);
      return jsonResponse(500, { error: "Nao foi possivel salvar o artefato do diagnostico canônico." }, origin);
    }

    let updatedRun = null;
    if (attachToCurrentRun && caseRow.current_run_id) {
      const { data: runData, error: runError } = await supabase
        .from("crm_diagnosis_runs")
        .update({
          final_output: {
            canonical_diagnosis: canonicalPayload,
            official_diagnostic_result: officialDiagnostic,
            official_execution_plan: officialExecutionPlan,
          },
        })
        .eq("id", caseRow.current_run_id)
        .select("*")
        .maybeSingle();

      if (runError) {
        console.error("generate-canonical-diagnosis update run error", runError);
      } else {
        updatedRun = runData;
      }
    }

    const nextCaseStatus = markReady && ["draft", "collecting_inputs"].includes(caseRow.status)
      ? "ready_to_run"
      : caseRow.status;

    const { data: updatedCase, error: updateCaseError } = await supabase
      .from("crm_diagnosis_cases")
      .update({
        status: nextCaseStatus,
        briefing_summary:
          caseRow.briefing_summary || latestInput.declared_need || lead.need || null,
      })
      .eq("id", caseRow.id)
      .select("*")
      .single();

    if (updateCaseError || !updatedCase) {
      console.error("generate-canonical-diagnosis update case error", updateCaseError);
      return jsonResponse(500, { error: "Diagnostico gerado, mas o caso nao foi atualizado." }, origin);
    }

    return jsonResponse(200, {
      ok: true,
      case: updatedCase,
      run: updatedRun,
      artifacts,
      canonical_diagnosis: canonicalPayload,
      official_diagnostic_result: officialDiagnostic,
      official_execution_plan: officialExecutionPlan,
      answer_count: Object.keys(answers).length,
    }, origin);
  } catch (error) {
    console.error("generate-canonical-diagnosis unexpected error", error);
    return jsonResponse(500, { error: "Erro inesperado ao gerar o diagnostico canônico." }, origin);
  }
});
