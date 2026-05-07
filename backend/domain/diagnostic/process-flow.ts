import type {
  AnalystStageDefinition,
  DiagnosisCaseSnapshot,
  DiagnosisCaseStatus,
  DiagnosisRunStatus,
  DiagnosisStepSnapshot,
  HabilisStepCode,
  ReadinessCheck,
  ReadinessReport,
} from "./types.ts";

export const HABILIS_STEP_SEQUENCE: Array<{
  code: HabilisStepCode;
  order: number;
  label: string;
  summary: string;
}> = [
  {
    code: "agent_01",
    order: 1,
    label: "Coleta oficial",
    summary: "Levanta base legal, institucional e tecnica oficial do tema.",
  },
  {
    code: "agent_02",
    order: 2,
    label: "Enquadramento",
    summary: "Estrutura o enquadramento regulatorio do caso.",
  },
  {
    code: "agent_04",
    order: 3,
    label: "Auditoria",
    summary: "Audita o enquadramento e classifica o risco regulatorio.",
  },
  {
    code: "agent_03",
    order: 4,
    label: "Operacionalizacao",
    summary: "Converte o enquadramento auditado em servico, escopo e fluxo.",
  },
];

export const ANALYST_STAGES: AnalystStageDefinition[] = [
  {
    id: "handoff",
    label: "Handoff",
    description: "Lead recebido do CRM e ainda sem caso operacional maduro.",
    caseStatuses: ["draft"],
  },
  {
    id: "briefing",
    label: "Briefing",
    description: "Analista consolida objetivo, escopo territorial e contexto do cliente.",
    caseStatuses: ["collecting_inputs"],
  },
  {
    id: "documents",
    label: "Documentos",
    description: "Caso em complementacao documental antes da execucao.",
    caseStatuses: ["collecting_inputs"],
  },
  {
    id: "ready_to_run",
    label: "Pronto para executar",
    description: "Entrada suficiente para preparar uma run do pipeline Habilis.",
    caseStatuses: ["ready_to_run"],
  },
  {
    id: "execution",
    label: "Execucao",
    description: "Run em andamento com etapas rastreadas por agente.",
    caseStatuses: ["running"],
  },
  {
    id: "human_review",
    label: "Revisao humana",
    description: "Saida consolidada aguardando decisao tecnica final.",
    caseStatuses: ["awaiting_human_review"],
  },
  {
    id: "closure",
    label: "Fechamento",
    description: "Caso aprovado, rejeitado ou arquivado.",
    caseStatuses: ["approved", "rejected", "archived"],
  },
];

const RUN_STATUS_BY_STEP: Record<HabilisStepCode, DiagnosisRunStatus> = {
  agent_01: "running_agent_01",
  agent_02: "running_agent_02",
  agent_04: "running_agent_04",
  agent_03: "running_agent_03",
};

export function resolveRunStatusForStep(stepCode: HabilisStepCode): DiagnosisRunStatus {
  return RUN_STATUS_BY_STEP[stepCode];
}

export function resolveAnalystStage(caseSnapshot: DiagnosisCaseSnapshot) {
  const hasDocuments = caseSnapshot.documents.length > 0;
  const readiness = buildCaseReadiness(caseSnapshot);

  if (caseSnapshot.status === "collecting_inputs" && !hasDocuments && readiness.score >= 40) {
    return ANALYST_STAGES.find((stage) => stage.id === "documents")!;
  }

  return (
    ANALYST_STAGES.find((stage) => stage.caseStatuses.includes(caseSnapshot.status)) ||
    ANALYST_STAGES[0]
  );
}

export function getCurrentStep(steps: DiagnosisStepSnapshot[]) {
  return steps.find((step) => step.status === "running") || null;
}

export function getCompletedSteps(steps: DiagnosisStepSnapshot[]) {
  return steps.filter((step) => step.status === "completed");
}

export function summarizeExecutionProgress(steps: DiagnosisStepSnapshot[]) {
  const total = HABILIS_STEP_SEQUENCE.length;
  const completed = getCompletedSteps(steps).length;
  const running = steps.filter((step) => step.status === "running").length;
  const failed = steps.filter((step) => step.status === "failed").length;

  return {
    total,
    completed,
    running,
    failed,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

export function buildCaseReadiness(caseSnapshot: DiagnosisCaseSnapshot): ReadinessReport {
  const checks: ReadinessCheck[] = [
    {
      key: "lead",
      label: "Lead vinculado",
      ok: Boolean(caseSnapshot.lead.id),
      detail: caseSnapshot.lead.id ? "Lead vinculado ao caso." : "Caso sem lead vinculado.",
    },
    {
      key: "briefing_summary",
      label: "Resumo de briefing",
      ok: Boolean(caseSnapshot.briefingSummary?.trim()),
      detail: caseSnapshot.briefingSummary?.trim()
        ? "Resumo inicial preenchido."
        : "Resumo do briefing ainda ausente.",
    },
    {
      key: "theme",
      label: "Tema definido",
      ok: Boolean(caseSnapshot.input?.theme?.trim()),
      detail: caseSnapshot.input?.theme?.trim()
        ? "Tema do diagnostico definido."
        : "Tema ainda nao definido no input.",
    },
    {
      key: "territorial_scope",
      label: "Escopo territorial",
      ok: Boolean(caseSnapshot.input?.territorialScope?.trim() || caseSnapshot.lead.state?.trim()),
      detail: caseSnapshot.input?.territorialScope?.trim() || caseSnapshot.lead.state?.trim()
        ? "Escopo territorial disponivel."
        : "Escopo territorial ainda nao consolidado.",
    },
    {
      key: "declared_need",
      label: "Necessidade declarada",
      ok: Boolean(caseSnapshot.input?.declaredNeed?.trim() || caseSnapshot.lead.need?.trim()),
      detail: caseSnapshot.input?.declaredNeed?.trim() || caseSnapshot.lead.need?.trim()
        ? "Necessidade principal registrada."
        : "Necessidade principal ainda nao registrada.",
    },
    {
      key: "documents_or_context",
      label: "Contexto minimo",
      ok: caseSnapshot.documents.length > 0 || Boolean(caseSnapshot.input?.customerContext?.trim()),
      detail: caseSnapshot.documents.length > 0
        ? `${caseSnapshot.documents.length} documento(s) indexado(s).`
        : caseSnapshot.input?.customerContext?.trim()
          ? "Contexto textual suficiente para iniciar analise."
          : "Sem documentos nem contexto minimo consolidado.",
    },
  ];

  const okCount = checks.filter((item) => item.ok).length;
  const score = Math.round((okCount / checks.length) * 100);

  return {
    ready: checks.every((item) => item.ok),
    score,
    missing: checks.filter((item) => !item.ok).map((item) => item.label),
    checks,
  };
}

export function inferSuggestedCaseStatus(caseSnapshot: DiagnosisCaseSnapshot): DiagnosisCaseStatus {
  const readiness = buildCaseReadiness(caseSnapshot);

  if (caseSnapshot.status === "running" || caseSnapshot.status === "awaiting_human_review") {
    return caseSnapshot.status;
  }

  if (readiness.ready) {
    return "ready_to_run";
  }

  if (caseSnapshot.briefingSummary?.trim() || caseSnapshot.input) {
    return "collecting_inputs";
  }

  return "draft";
}
