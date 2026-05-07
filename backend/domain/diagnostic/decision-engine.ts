import { buildCaseReadiness, summarizeExecutionProgress } from "./process-flow.ts";
import type {
  DecisionSignal,
  DiagnosisCaseSnapshot,
  DiagnosisPriority,
  ExecutionRecommendation,
} from "./types.ts";

function normalizeText(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern));
}

function deriveSignals(caseSnapshot: DiagnosisCaseSnapshot): DecisionSignal[] {
  const signals: DecisionSignal[] = [];
  const readiness = buildCaseReadiness(caseSnapshot);
  const leadNeed = normalizeText(caseSnapshot.input?.declaredNeed || caseSnapshot.lead.need);
  const constraints = normalizeText(caseSnapshot.input?.knownConstraints);
  const progress = summarizeExecutionProgress(caseSnapshot.steps);

  if (!readiness.ready) {
    signals.push({
      severity: "warning",
      code: "missing_inputs",
      title: "Entrada ainda incompleta",
      detail: `Faltam ${readiness.missing.length} elemento(s) essenciais para rodar o diagnostico.`,
    });
  }

  if (!caseSnapshot.documents.length) {
    signals.push({
      severity: "info",
      code: "documents_absent",
      title: "Sem documentos anexados",
      detail: "O caso ainda depende de leitura contextual ou upload de evidencias.",
    });
  }

  if (includesAny(leadNeed, ["passivo", "auto de infracao", "embargo", "multa", "irregular"])) {
    signals.push({
      severity: "critical",
      code: "regulatory_exposure",
      title: "Possivel exposicao regulatoria elevada",
      detail: "A necessidade declarada sugere risco regulatorio ou passivo relevante.",
    });
  }

  if (includesAny(constraints, ["prazo", "urgente", "fiscalizacao", "auditoria", "vencimento"])) {
    signals.push({
      severity: "warning",
      code: "time_constraint",
      title: "Restricao temporal identificada",
      detail: "O briefing indica pressao de prazo, fiscalizacao ou exigencia externa.",
    });
  }

  if (caseSnapshot.status === "running" && progress.failed > 0) {
    signals.push({
      severity: "critical",
      code: "failed_step",
      title: "Execucao com etapa falha",
      detail: "Pelo menos uma etapa do pipeline falhou e exige reavaliacao manual.",
    });
  }

  if (caseSnapshot.status === "awaiting_human_review") {
    signals.push({
      severity: "info",
      code: "awaiting_review",
      title: "Aguardando decisao humana",
      detail: "A run foi consolidada e depende de validacao tecnica final.",
    });
  }

  return signals;
}

export function computeCasePriority(caseSnapshot: DiagnosisCaseSnapshot): DiagnosisPriority {
  const leadUrgency = normalizeText(caseSnapshot.lead.urgency);
  const diagnosisType = normalizeText(caseSnapshot.diagnosisType);
  const signals = deriveSignals(caseSnapshot);
  const criticalCount = signals.filter((signal) => signal.severity === "critical").length;
  const warningCount = signals.filter((signal) => signal.severity === "warning").length;

  if (leadUrgency === "critica" || criticalCount > 0) return "critical";
  if (leadUrgency === "alta" || warningCount >= 2) return "high";
  if (diagnosisType === "regularizacao_ambiental" || diagnosisType === "pgrss") return "normal";
  return "low";
}

export function recommendExecutionMode(caseSnapshot: DiagnosisCaseSnapshot) {
  const diagnosisType = normalizeText(caseSnapshot.diagnosisType);
  const readiness = buildCaseReadiness(caseSnapshot);

  if (!readiness.ready) return "manual" as const;

  if (
    diagnosisType === "regularizacao_ambiental" ||
    diagnosisType === "mapeamento_normativo_territorial"
  ) {
    return "hybrid" as const;
  }

  return "manual" as const;
}

export function buildExecutionRecommendation(caseSnapshot: DiagnosisCaseSnapshot): ExecutionRecommendation {
  const signals = deriveSignals(caseSnapshot);
  const readiness = buildCaseReadiness(caseSnapshot);
  const executionMode = recommendExecutionMode(caseSnapshot);
  const priority = computeCasePriority(caseSnapshot);

  let recommendedNextAction = "Consolidar briefing inicial.";

  if (caseSnapshot.status === "draft") {
    recommendedNextAction = "Validar handoff do CRM e abrir briefing do caso.";
  } else if (!readiness.ready) {
    recommendedNextAction = "Completar os campos obrigatorios e anexar contexto minimo.";
  } else if (caseSnapshot.status === "ready_to_run") {
    recommendedNextAction = "Preparar a run do pipeline Habilis.";
  } else if (caseSnapshot.status === "running") {
    recommendedNextAction = "Acompanhar a etapa atual e registrar as saidas por agente.";
  } else if (caseSnapshot.status === "awaiting_human_review") {
    recommendedNextAction = "Revisar a saida consolidada e decidir aprovacao ou reprova.";
  } else if (caseSnapshot.status === "approved") {
    recommendedNextAction = "Gerar artefatos finais e encaminhar para proposta ou entrega.";
  }

  return {
    priority,
    executionMode,
    recommendedNextAction,
    signals,
  };
}
