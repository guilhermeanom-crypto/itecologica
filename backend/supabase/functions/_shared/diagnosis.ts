import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type InternalUserContext = {
  email: string;
  fullName: string | null;
  role: string | null;
};

export type DiagnosisStepDefinition = {
  order: number;
  code: string;
  agentName: string;
  promptSourceRef: string;
  summary: string;
  expectedSections: string[];
};

export type DiagnosisQualificationQuestionnaire = {
  demandType: string;
  licenseStatus: string;
  licenseExpired: string;
  expiredSince: string;
  activeInspection: string;
  activeFine: string;
  urgentDeadlineDays: string;
  availableDocuments: string;
  requiredService: string;
  cnae: string;
  activityType: string;
  probableAgency: string;
  leadTemperature: string;
};

export const DIAGNOSIS_STEPS: DiagnosisStepDefinition[] = [
  {
    order: 1,
    code: "agent_01",
    agentName: "Agente 01 - Coletor Normativo Oficial",
    promptSourceRef: "ITECOLOGICA/backend/assets/habilis/agents/agente_01_coletor.txt",
    summary: "Levanta base legal, tecnica, institucional, sistemas e instrumentos oficiais do tema.",
    expectedSections: ["meta", "base_oficial"],
  },
  {
    order: 2,
    code: "agent_02",
    agentName: "Agente 02 - Estruturador de Enquadramento",
    promptSourceRef: "ITECOLOGICA/backend/assets/habilis/agents/agente_02_estruturador.txt",
    summary: "Estrutura o enquadramento regulatorio a partir da base coletada pelo agente 01.",
    expectedSections: ["enquadramento"],
  },
  {
    order: 3,
    code: "agent_04",
    agentName: "Agente 04 - Auditor Regulatorio",
    promptSourceRef: "ITECOLOGICA/backend/assets/habilis/agents/agente_04_auditor.txt",
    summary: "Audita o enquadramento, localiza falhas e classifica o risco regulatorio global.",
    expectedSections: ["auditoria"],
  },
  {
    order: 4,
    code: "agent_03",
    agentName: "Agente 03 - Estruturador Operacional e de Servicos",
    promptSourceRef: "ITECOLOGICA/backend/assets/habilis/agents/agente_03_operacional.txt",
    summary: "Converte o enquadramento auditado em fluxo operacional, escopo tecnico e precificacao.",
    expectedSections: ["operacional", "servico", "precificacao", "interface"],
  },
];

export const ACTIVE_EXECUTION_RUN_STATUSES = [
  "queued",
  "running_agent_01",
  "running_agent_02",
  "running_agent_04",
  "running_agent_03",
  "awaiting_outputs",
] as const;

export const FINISHED_STEP_STATUSES = ["completed", "skipped"] as const;

export function buildCors(origin: string) {
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": origin,
    "Content-Type": "application/json",
  };
}

export function resolveOrigin(req: Request) {
  return req.headers.get("origin")?.trim() || "*";
}

export function jsonResponse(status: number, payload: Record<string, unknown>, origin: string) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: buildCors(origin),
  });
}

export function getEnvOrThrow(name: string) {
  const value = (Deno.env.get(name) || "").trim();
  if (!value) {
    throw new Error(`Variavel de ambiente ausente: ${name}`);
  }
  return value;
}

export function createAdminClient() {
  const supabaseUrl = getEnvOrThrow("SUPABASE_URL");
  const serviceRoleKey = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireInternalUser(req: Request, supabase: ReturnType<typeof createAdminClient>) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { error: jsonResponse(401, { error: "Token ausente." }, resolveOrigin(req)) };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user?.email) {
    return { error: jsonResponse(401, { error: "Usuario nao autenticado." }, resolveOrigin(req)) };
  }

  const email = authData.user.email.trim().toLowerCase();
  const { data: user, error: userError } = await supabase
    .from("crm_internal_users")
    .select("email, full_name, role, active")
    .eq("email", email)
    .maybeSingle();

  if (userError || !user || !user.active) {
    return { error: jsonResponse(403, { error: "Usuario sem acesso ao CRM interno." }, resolveOrigin(req)) };
  }

  return {
    user: {
      email,
      fullName: user.full_name || null,
      role: user.role || null,
    } satisfies InternalUserContext,
  };
}

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function toArray<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function normalizeIntegerString(value: unknown) {
  const text = normalizeText(value);
  if (!text) return "";
  const digits = text.replace(/[^\d]/g, "");
  return digits ? String(Number(digits)) : "";
}

function extractObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function extractQualificationQuestionnaire(inputPayload: Record<string, unknown>): DiagnosisQualificationQuestionnaire {
  const nested = extractObject(
    inputPayload.qualification_questionnaire || inputPayload.qualificacao_estruturada,
  );
  const source = Object.keys(nested).length ? nested : inputPayload;

  return {
    demandType: normalizeText(
      source.demand_type || source.demanda_tipo || source.service_demand,
    ),
    licenseStatus: normalizeText(
      source.license_status || source.situacao_licenca || source.enterprise_license_status,
    ),
    licenseExpired: normalizeText(
      source.license_expired || source.licenca_vencida,
    ).toLowerCase(),
    expiredSince: normalizeText(
      source.expired_since || source.licenca_vencida_desde,
    ),
    activeInspection: normalizeText(
      source.active_inspection || source.fiscalizacao_ativa,
    ).toLowerCase(),
    activeFine: normalizeText(
      source.active_fine || source.multa_ativa,
    ).toLowerCase(),
    urgentDeadlineDays: normalizeIntegerString(
      source.urgent_deadline_days || source.prazo_urgente_dias,
    ),
    availableDocuments: normalizeText(
      source.available_documents || source.documentos_disponiveis,
    ),
    requiredService: normalizeText(
      source.required_service || source.tipo_servico_necessario,
    ),
    cnae: normalizeText(
      source.cnae || source.cnae_principal,
    ),
    activityType: normalizeText(
      source.activity_type || source.tipo_atividade,
    ),
    probableAgency: normalizeText(
      source.probable_agency || source.orgao_ambiental_provavel,
    ),
    leadTemperature: normalizeText(
      source.lead_temperature || source.classificacao_lead,
    ).toLowerCase(),
  };
}

export function buildQualificationContext(args: {
  lead: Record<string, unknown>;
  inputPayload: Record<string, unknown>;
  declaredNeed: string;
  briefingSummary: string;
}) {
  const { lead, inputPayload, declaredNeed, briefingSummary } = args;
  const questionnaire = extractQualificationQuestionnaire(inputPayload);
  const urgency = normalizeText(lead.urgency).toLowerCase();
  const deadlineDays = Number(questionnaire.urgentDeadlineDays || 0);
  const hasExpiredLicense = questionnaire.licenseExpired === "sim";
  const hasInspection = questionnaire.activeInspection === "sim";
  const hasFine = questionnaire.activeFine === "sim";
  const missingInformation = dedupeStrings([
    questionnaire.demandType ? "" : "demanda_tipo",
    questionnaire.licenseStatus ? "" : "situacao_licenca",
    questionnaire.activeInspection ? "" : "fiscalizacao_ativa",
    questionnaire.activeFine ? "" : "multa_ativa",
    questionnaire.requiredService ? "" : "tipo_servico_necessario",
  ]);

  let criticality = "normal";
  if (
    urgency === "critica" ||
    hasFine ||
    (deadlineDays > 0 && deadlineDays <= 7)
  ) {
    criticality = "critical";
  } else if (
    urgency === "alta" ||
    hasInspection ||
    hasExpiredLicense ||
    (deadlineDays > 0 && deadlineDays <= 30)
  ) {
    criticality = "high";
  } else if (urgency === "baixa") {
    criticality = "low";
  }

  const attentionFlags = dedupeStrings([
    hasExpiredLicense ? "licenca_vencida_ou_irregular" : "",
    hasInspection ? "fiscalizacao_em_andamento" : "",
    hasFine ? "multa_ativa" : "",
    deadlineDays > 0 && deadlineDays <= 30 ? "prazo_urgente" : "",
    normalizeText(lead.need) && !questionnaire.demandType ? "demanda_sem_categorizacao" : "",
  ]);

  const recommendedDocuments = dedupeStrings([
    questionnaire.cnae ? "cartao_cnpj_e_comprovacao_cnae" : "",
    questionnaire.licenseStatus && questionnaire.licenseStatus !== "vigente"
      ? "licencas_ambientais_atuais_e_anteriores"
      : "",
    hasInspection || hasFine
      ? "autos_notificacoes_multas_e_relatorios_de_fiscalizacao"
      : "",
    questionnaire.availableDocuments ? "" : "inventario_inicial_de_documentos_disponiveis",
    questionnaire.requiredService ? "comprovantes_e_historico_relacionados_ao_servico_solicitado" : "",
  ]);

  return {
    questionnaire,
    derived: {
      declared_need_normalized: declaredNeed || normalizeText(lead.need),
      briefing_summary_normalized: briefingSummary,
      criticality,
      attention_flags: attentionFlags,
      missing_information: missingInformation,
      recommended_documents: recommendedDocuments,
      readiness_score: Math.max(0, 100 - (missingInformation.length * 15)),
    },
  };
}

export function buildTerritorialScope(lead: Record<string, unknown>, inputPayload: Record<string, unknown>) {
  const explicitScope = normalizeText(inputPayload.territorial_scope || inputPayload.territorialScope);
  if (explicitScope) return explicitScope;

  const city = normalizeText(lead.city);
  const state = normalizeText(lead.state);
  if (city && state) return `${city}/${state}`;
  return state || city || "";
}

export function buildDiagnosisTitle(diagnosisType: string, company: string, city: string, state: string) {
  const target = [company, city && state ? `${city}/${state}` : city || state].filter(Boolean).join(" - ");
  return target ? `${diagnosisType} - ${target}` : diagnosisType;
}

export function buildPipelineManifest(args: {
  lead: Record<string, unknown>;
  caseRow: Record<string, unknown>;
  inputRow: Record<string, unknown> | null;
  documents: Record<string, unknown>[];
  executionMode: string;
  modelProvider: string;
  modelName: string;
}) {
  const { lead, caseRow, inputRow, documents, executionMode, modelProvider, modelName } = args;
  const inputPayload = ((inputRow?.json_payload as Record<string, unknown> | null) || {});
  const territorialScope = buildTerritorialScope(lead, inputPayload);
  const tema = normalizeText(inputRow?.theme) || normalizeText(caseRow.diagnosis_type);
  const qualificationContext = buildQualificationContext({
    lead,
    inputPayload,
    declaredNeed: normalizeText(inputRow?.declared_need) || normalizeText(lead.need),
    briefingSummary: normalizeText(caseRow.briefing_summary),
  });

  return {
    tema,
    escopo_territorial: territorialScope,
    execution_mode: executionMode,
    model_provider: modelProvider,
    model_name: modelName,
    source_case: {
      case_id: caseRow.id,
      lead_id: caseRow.lead_id,
      diagnosis_type: caseRow.diagnosis_type,
      title: caseRow.title,
      briefing_summary: caseRow.briefing_summary,
    },
    lead_context: {
      company: lead.company,
      need: lead.need,
      urgency: lead.urgency,
      city: lead.city,
      state: lead.state,
      notes: lead.notes,
    },
    input_context: {
      theme: inputRow?.theme || null,
      territorial_scope: territorialScope || null,
      customer_context: inputRow?.customer_context || null,
      declared_need: inputRow?.declared_need || null,
      known_constraints: inputRow?.known_constraints || null,
      qualification_questionnaire: qualificationContext.questionnaire,
      payload: inputPayload,
    },
    qualification_context: qualificationContext,
    documents: documents.map((document) => ({
      id: document.id,
      file_name: document.file_name,
      file_path: document.file_path,
      document_type: document.document_type,
      ocr_status: document.ocr_status,
    })),
    steps: DIAGNOSIS_STEPS.map((step) => ({
      order: step.order,
      code: step.code,
      agent_name: step.agentName,
      prompt_source_ref: step.promptSourceRef,
      summary: step.summary,
      expected_sections: step.expectedSections,
    })),
  };
}

export function buildStepInputPayload(
  step: DiagnosisStepDefinition,
  manifest: ReturnType<typeof buildPipelineManifest>,
) {
  const base = {
    tema: manifest.tema,
    escopo_territorial: manifest.escopo_territorial,
    lead_context: manifest.lead_context,
    input_context: manifest.input_context,
    qualification_context: manifest.qualification_context,
    documents: manifest.documents,
  };

  switch (step.code) {
    case "agent_01":
      return {
        ...base,
        objective: "Construir a base normativa e institucional oficial do tema.",
      };
    case "agent_02":
      return {
        ...base,
        depends_on: ["agent_01"],
        objective: "Estruturar enquadramento regulatorio a partir da base oficial.",
      };
    case "agent_04":
      return {
        ...base,
        depends_on: ["agent_01", "agent_02"],
        objective: "Auditar o enquadramento e classificar risco regulatorio.",
      };
    case "agent_03":
      return {
        ...base,
        depends_on: ["agent_01", "agent_02", "agent_04"],
        objective: "Transformar o enquadramento auditado em fluxo operacional e servico.",
      };
    default:
      return base;
  }
}

export function mergeDiagnosisOutputs(stepOutputs: Record<string, Record<string, unknown>>) {
  const agent01 = stepOutputs.agent_01 || {};
  const agent02 = stepOutputs.agent_02 || {};
  const agent04 = stepOutputs.agent_04 || {};
  const agent03 = stepOutputs.agent_03 || {};

  return {
    ...agent01,
    enquadramento: agent02.enquadramento || {},
    auditoria: agent04.auditoria || {},
    operacional: agent03.operacional || {},
    servico: agent03.servico || {},
    precificacao: agent03.precificacao || {},
    interface: agent03.interface || {},
    pipeline: {
      steps_completed: Object.keys(stepOutputs),
    },
  };
}

export function deriveRunStatusFromSteps(steps: Array<Record<string, unknown>>) {
  const normalized = [...steps].sort((a, b) => Number(a.step_order) - Number(b.step_order));

  if (normalized.some((step) => step.status === "failed")) {
    return "failed";
  }

  const firstPending = normalized.find((step) => !FINISHED_STEP_STATUSES.includes(step.status as "completed" | "skipped"));
  if (!firstPending) {
    return "awaiting_human_review";
  }

  switch (firstPending.step_code) {
    case "agent_01":
      return "running_agent_01";
    case "agent_02":
      return "running_agent_02";
    case "agent_04":
      return "running_agent_04";
    case "agent_03":
      return "running_agent_03";
    default:
      return "awaiting_outputs";
  }
}
