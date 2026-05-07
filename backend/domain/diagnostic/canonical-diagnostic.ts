// =====================================================================
// ALVO CANONICO DA UNIFICACAO (Etapa 4 do plano de consolidacao).
//
// Esta e a versao em desenvolvimento do motor canonico de diagnostico,
// destinada a substituir `backend/supabase/functions/_shared/official-diagnostic.ts`
// como fonte unica em uma proxima etapa.
//
// Hoje esta camada e CODIGO DORMENTE: nenhuma edge function importa daqui
// em producao. A versao em producao continua sendo a do `_shared/`.
//
// Divergencias atuais conhecidas em relacao a producao:
// - acentuacao portuguesa preservada (Agua/Água, Gestao/Gestão, etc.)
// - travessao tipografico (—) em vez de hifen (-)
// - estrutura modular separada em arquivos: canonical-diagnostic.ts,
//   official-diagnostic-engine.ts, official-execution-plan.ts
//
// Plano de unificacao: docs/PLANO_UNIFICACAO_MOTOR_DIAGNOSTICO_V1.md
// =====================================================================

import type {
  CanonicalDiagnosisContextInput,
  CanonicalDiagnosisPayload,
  CanonicalDiagnosticClassification,
  CanonicalDiagnosticNeeds,
  CanonicalDiagnosticProfile,
  CanonicalDiagnosisSource,
  DiagnosticAnswers,
  PollutionPotential,
} from "./types.ts";

const DEFAULT_STRATEGY = [
  {
    etapa: 1,
    titulo: "Regularização Documental",
    descricao: "Organização de documentos e cadastros.",
    prazo: "30 dias",
    progresso: 0,
  },
  {
    etapa: 2,
    titulo: "Licenciamento Ambiental",
    descricao: "Protocolo do processo de licenciamento.",
    prazo: "90 dias",
    progresso: 0,
  },
  {
    etapa: 3,
    titulo: "Programas Ambientais",
    descricao: "Implementação de PGRS, monitoramento e controles.",
    prazo: "120 dias",
    progresso: 0,
  },
  {
    etapa: 4,
    titulo: "Monitoramento Contínuo",
    descricao: "Acompanhamento periódico e relatórios.",
    prazo: "Contínuo",
    progresso: 0,
  },
];

function normalizeAnswer(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function computeRiskScore(answers: DiagnosticAnswers): number {
  let score = 30;
  if (answers.captacao === "sim") score += 10;
  if (answers.efluentes === "sim") score += 8;
  if (answers.gera_residuos === "sim") score += 5;
  if (answers.perigosos === "sim") score += 12;
  if (answers.emissoes_atm === "sim") score += 8;
  if (answers.passivo === "sim") score += 15;
  if (answers.licenca === "nao") score += 10;
  if (answers.app === "sim") score += 8;
  if (answers.area_sensivel === "sim") score += 7;
  if (answers.pendencia_doc === "sim") score += 5;
  return Math.min(score, 100);
}

export function derivePotentialPoluidor(
  answers: DiagnosticAnswers,
  score: number,
): PollutionPotential {
  if (
    answers.perigosos === "sim" ||
    answers.passivo === "sim" ||
    answers.emissoes_atm === "sim" ||
    score >= 70
  ) {
    return "alto";
  }
  if (
    answers.captacao === "sim" ||
    answers.efluentes === "sim" ||
    answers.gera_residuos === "sim" ||
    score >= 50
  ) {
    return "medio";
  }
  return "baixo";
}

export function buildRiskLevel(score: number) {
  if (score >= 70) return "Alto";
  if (score >= 50) return "Moderado";
  return "Baixo";
}

export function buildImpactClass(score: number) {
  return `Classe ${score >= 70 ? "III" : score >= 50 ? "II" : "I"} — ${buildRiskLevel(score)} potencial poluidor`;
}

export function buildDefaultStrategy() {
  return DEFAULT_STRATEGY.map((item) => ({ ...item }));
}

export function buildStandaloneDiagnosisSeed(answers: DiagnosticAnswers): CanonicalDiagnosisPayload {
  let score = 30;
  const obligations: string[] = [];
  const services: string[] = [];

  if (answers.captacao === "sim") {
    score += 10;
    obligations.push("Outorga de Uso de Água");
    services.push("Processo de Outorga");
  }
  if (answers.efluentes === "sim") {
    score += 8;
    obligations.push("Monitoramento de Efluentes");
    services.push("Monitoramento de Efluentes");
  }
  if (answers.gera_residuos === "sim") {
    score += 5;
    obligations.push("PGRS");
    services.push("Elaboração de PGRS");
  }
  if (answers.perigosos === "sim") {
    score += 12;
    obligations.push("Gestão de Resíduos Perigosos");
    services.push("Gestão de Resíduos Classe I");
  }
  if (answers.emissoes_atm === "sim") {
    score += 8;
    obligations.push("Controle de Emissões");
    services.push("Controle de Emissões Atmosféricas");
  }
  if (answers.passivo === "sim") {
    score += 15;
    obligations.push("Remediação de Passivo");
    services.push("Investigação de Passivo Ambiental");
  }
  if (answers.licenca === "nao") {
    score += 10;
    obligations.push("Licenciamento Ambiental");
    services.push("Licenciamento Ambiental — Processo LO");
  }
  if (answers.app === "sim") {
    score += 8;
    obligations.push("Adequação APP");
    services.push("Adequação Ambiental APP");
  }
  if (answers.area_sensivel === "sim") {
    score += 7;
  }
  if (answers.pendencia_doc === "sim") {
    score += 5;
    obligations.push("Regularização Documental");
    services.push("Regularização Documental");
  }

  if (!obligations.length) {
    obligations.push("Licenciamento Ambiental", "Cadastro Técnico Federal");
    services.push("Licenciamento Ambiental — Processo LO", "Cadastro Técnico Federal");
  }

  score = Math.min(score, 100);
  const riskLevel = buildRiskLevel(score);
  const serviceComplexity = 1.0 + (score >= 70 ? 0.4 : 0.1);

  return {
    risk_score: score,
    risk_level: riskLevel,
    classe_impacto: buildImpactClass(score),
    orgao_licenciador: "Órgão Estadual (SEMAD/CETESB/INEA)",
    tipo_licenciamento: score >= 70
      ? "Licenciamento Trifásico (LP, LI, LO)"
      : "Licenciamento Simplificado",
    obrigacoes: obligations.map((obrigacao) => ({
      nome: obrigacao,
      base_legal: "Legislação aplicável",
      orgao: "Órgão competente",
      prioridade: score >= 70 ? "Alta" : "Média",
      status: "identificada",
    })),
    servicos_recomendados: services.map((service, index) => {
      const horas = 24 + index * 8;
      const valorHora = 200;
      const total = horas * valorHora * serviceComplexity;
      return {
        servico_id: `SVC-${index}`,
        servico_nome: service,
        horas,
        valor_hora: valorHora,
        complexidade: serviceComplexity,
        total,
      };
    }),
    estrategia: buildDefaultStrategy(),
  };
}

export function buildDiagnosticProfile(
  context: CanonicalDiagnosisContextInput,
): CanonicalDiagnosticProfile {
  return {
    empreendimento: context.empresaNome || "Empreendimento",
    cliente: context.clienteNome || "Nao informado",
    cnae: context.empresaCnae || "Nao informado",
    situacao: context.statusEmp || "Nao informado",
    porte: context.porte || "",
    local: [context.municipio, context.estado].filter(Boolean).join("/") || "Nao informado",
  };
}

export function buildDiagnosticClassification(
  result: CanonicalDiagnosisPayload,
  answers: DiagnosticAnswers,
): CanonicalDiagnosticClassification {
  return {
    classe_impacto: result.classe_impacto,
    tipo_licenciamento: result.tipo_licenciamento,
    orgao_licenciador: result.orgao_licenciador,
    potencial_poluidor: derivePotentialPoluidor(answers, result.risk_score),
  };
}

export function buildDiagnosticNeeds(
  result: CanonicalDiagnosisPayload,
  answers: DiagnosticAnswers,
): CanonicalDiagnosticNeeds {
  const obrigacoes = result.obrigacoes.map((item) => item.nome.toLowerCase());

  return {
    estudos_ambientais:
      result.risk_score >= 70 ||
      obrigacoes.some((nome) => nome.includes("estudo") || nome.includes("impacto")),
    outorga_hidrica:
      answers.captacao === "sim" ||
      obrigacoes.some((nome) => nome.includes("outorga")),
    logistica_reversa:
      answers.logistica_reversa === "sim" ||
      obrigacoes.some((nome) => nome.includes("logistica reversa")),
    cadastro_tecnico_federal:
      obrigacoes.some((nome) => nome.includes("cadastro tecnico") || nome.includes("ctf")),
    programas_ambientais:
      answers.gera_residuos === "sim" ||
      answers.emissoes_atm === "sim" ||
      obrigacoes.some((nome) => nome.includes("pgrs") || nome.includes("monitoramento")),
    monitoramento:
      result.risk_score >= 50 ||
      answers.monitoramento === "sim" ||
      obrigacoes.some((nome) => nome.includes("monitoramento")),
  };
}

export function buildRiskFactors(params: {
  answers: DiagnosticAnswers;
  result: CanonicalDiagnosisPayload;
  statusEmp: string;
}) {
  const factors: string[] = [];
  const { answers, result, statusEmp } = params;

  if (answers.licenca === "nao") factors.push("Ausencia de licenca ambiental vigente");
  if (answers.passivo === "sim") factors.push("Passivo ambiental declarado na caracterizacao");
  if (answers.captacao === "sim") factors.push("Uso de recurso hidrico com potencial necessidade de outorga");
  if (answers.efluentes === "sim") factors.push("Geracao ou lancamento de efluentes");
  if (answers.gera_residuos === "sim") factors.push("Geracao de residuos com necessidade de controle");
  if (answers.perigosos === "sim") factors.push("Presenca de residuos perigosos");
  if (answers.emissoes_atm === "sim") factors.push("Presenca de emissoes atmosfericas");
  if (answers.area_sensivel === "sim" || answers.app === "sim") factors.push("Sensibilidade territorial relevante");
  if (normalizeAnswer(statusEmp) === "irregular") factors.push("Empreendimento marcado como irregular na triagem");
  if (result.obrigacoes.length >= 5) factors.push(`${result.obrigacoes.length} obrigacoes regulatorias identificadas`);
  if (!factors.length) factors.push("Cenario de menor criticidade com base nas respostas registradas");

  return factors;
}

export function buildCanonicalDiagnosisPayload(params: {
  result: CanonicalDiagnosisPayload;
  answers: DiagnosticAnswers;
  source: CanonicalDiagnosisSource;
  context: CanonicalDiagnosisContextInput;
}) {
  const perfil = buildDiagnosticProfile(params.context);
  const classificacao = buildDiagnosticClassification(params.result, params.answers);
  const necessidades = buildDiagnosticNeeds(params.result, params.answers);
  const fatoresRisco = buildRiskFactors({
    answers: params.answers,
    result: params.result,
    statusEmp: params.context.statusEmp,
  });
  const now = new Date().toISOString();

  return {
    ...params.result,
    meta: {
      status: "concluido",
      source: params.source,
      generated_at: now,
      completed_at: now,
      case_id: params.context.caseId || null,
      lead_id: params.context.leadId || null,
      run_id: params.context.runId || null,
      empreendimento_nome: params.context.empresaNome || "Empreendimento",
      cnae: params.context.empresaCnae || null,
    },
    perfil_diagnostico: perfil,
    classificacao_detalhada: classificacao,
    necessidades,
    fatores_risco: fatoresRisco,
  };
}
