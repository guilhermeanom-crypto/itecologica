// =====================================================================
// FONTE CANONICA EM PRODUCAO (V1).
//
// Esta e a implementacao que esta viva no edge runtime: gera o
// canonical_diagnosis_json, official_diagnostic_result_json e
// official_execution_plan_json consumidos pela edge function
// `generate-canonical-diagnosis` e exibidos na Area do Analista.
//
// NAO editar isoladamente. Existe uma copia espelhada em
// `backend/domain/diagnostic/` que sera promovida a fonte canonica
// durante a Etapa 4 do plano de consolidacao (vide
// `docs/PLANO_UNIFICACAO_MOTOR_DIAGNOSTICO_V1.md`). As duas versoes
// JA divergem em acentuacao e pontuacao tipografica, entao mudancas
// aqui devem ser replicadas com cuidado em ambos os lados ate a
// unificacao com snapshot test.
//
// Consumidor: backend/supabase/functions/generate-canonical-diagnosis/index.ts
// =====================================================================

export type CanonicalDiagnosisSource =
  | "analyst_area"
  | "standalone"
  | "pipeline_habilis";

export type PollutionPotential = "alto" | "medio" | "baixo";

export type DiagnosticAnswers = Record<string, string>;

type CanonicalObligation = {
  nome: string;
  base_legal: string;
  orgao: string;
  prioridade: "Alta" | "Media" | "Baixa";
  status: string;
};

type CanonicalRecommendedService = {
  servico_id: string;
  servico_nome: string;
  horas: number;
  valor_hora: number;
  complexidade: number;
  total: number;
};

type CanonicalStrategyStep = {
  etapa: number;
  titulo: string;
  descricao: string;
  prazo: string;
  progresso: number;
};

type CanonicalDiagnosisPayload = {
  risk_score: number;
  risk_level: string;
  classe_impacto: string;
  orgao_licenciador: string;
  tipo_licenciamento: string;
  obrigacoes: CanonicalObligation[];
  servicos_recomendados: CanonicalRecommendedService[];
  estrategia: CanonicalStrategyStep[];
  meta?: Record<string, unknown>;
  perfil_diagnostico?: Record<string, unknown>;
  classificacao_detalhada?: Record<string, unknown>;
  necessidades?: Record<string, unknown>;
  fatores_risco?: string[];
};

type CanonicalDiagnosisContextInput = {
  caseId?: string | null;
  leadId?: string | null;
  runId?: string | null;
  empresaNome: string;
  clienteNome: string;
  empresaCnae: string;
  municipio: string;
  estado: string;
  statusEmp: string;
  porte: string;
};

type OfficialDiagnosticInput = {
  diagnosisType: string;
  companyName: string;
  clientName: string;
  cnae: string;
  municipality: string;
  state: string;
  enterpriseStatus: string;
  enterpriseSize: string;
  declaredNeed?: string | null;
  territorialScope?: string | null;
  knownConstraints?: string | null;
  answers: DiagnosticAnswers;
};

type OfficialDerivedObligation = {
  code: string;
  title: string;
  legalBasis: string;
  agency: string;
  priority: "Alta" | "Media" | "Baixa";
  status: "identificada";
  reason: string;
};

type OfficialDerivedService = {
  code: string;
  title: string;
  category: string;
  estimatedHours: number;
  hourlyRate: number;
  complexityFactor: number;
  total: number;
  linkedObligationCode: string;
};

type OfficialStrategyMilestone = {
  order: number;
  title: string;
  description: string;
  expectedDays: number;
};

export type OfficialDiagnosticResult = {
  profile: {
    empreendimento: string;
    cliente: string;
    cnae: string;
    situacao: string;
    porte?: string;
    local: string;
  };
  riskScore: number;
  riskLevel: string;
  impactClass: string;
  licensingType: string;
  licensingAgency: string;
  pollutionPotential: PollutionPotential;
  executionMode: "manual" | "hybrid";
  obligations: OfficialDerivedObligation[];
  services: OfficialDerivedService[];
  strategy: OfficialStrategyMilestone[];
  signals: string[];
};

type OfficialExecutionPhaseName =
  | "diagnostico"
  | "regularizacao"
  | "implantacao"
  | "monitoramento";

type OfficialExecutionTaskPriority = "critica" | "alta" | "media" | "baixa";

type OfficialExecutionTaskStatus = "pendente" | "em_andamento" | "concluida" | "bloqueada";

type OfficialExecutionPhase = {
  code: OfficialExecutionPhaseName;
  title: string;
  description: string;
  order: number;
};

type OfficialExecutionTask = {
  code: string;
  title: string;
  description: string;
  phaseCode: OfficialExecutionPhaseName;
  priority: OfficialExecutionTaskPriority;
  status: OfficialExecutionTaskStatus;
  owner: string;
  expectedDays: number;
  obligationCode?: string | null;
  serviceCode?: string | null;
};

type OfficialExecutionDeadline = {
  code: string;
  title: string;
  dueInDays: number;
  priority: OfficialExecutionTaskPriority;
  linkedTaskCode: string;
  recurring: boolean;
};

type OfficialExecutionMonitoring = {
  code: string;
  title: string;
  periodicity: "mensal" | "trimestral" | "semestral" | "anual" | "sob_demanda";
  owner: string;
  linkedObligationCode?: string | null;
  requiresEvidence: boolean;
};

export type OfficialExecutionPlan = {
  summary: {
    totalPhases: number;
    totalTasks: number;
    totalDeadlines: number;
    totalMonitorings: number;
  };
  phases: OfficialExecutionPhase[];
  tasks: OfficialExecutionTask[];
  deadlines: OfficialExecutionDeadline[];
  monitorings: OfficialExecutionMonitoring[];
};

const DEFAULT_STRATEGY = [
  {
    etapa: 1,
    titulo: "Regularizacao Documental",
    descricao: "Organizacao de documentos e cadastros.",
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
    descricao: "Implementacao de PGRS, monitoramento e controles.",
    prazo: "120 dias",
    progresso: 0,
  },
  {
    etapa: 4,
    titulo: "Monitoramento Continuo",
    descricao: "Acompanhamento periodico e relatorios.",
    prazo: "Continuo",
    progresso: 0,
  },
];

function normalizeAnswer(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
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
  ) return "alto";

  if (
    answers.captacao === "sim" ||
    answers.efluentes === "sim" ||
    answers.gera_residuos === "sim" ||
    score >= 50
  ) return "medio";

  return "baixo";
}

function buildRiskLevel(score: number) {
  if (score >= 70) return "Alto";
  if (score >= 50) return "Moderado";
  return "Baixo";
}

function buildImpactClass(score: number) {
  return `Classe ${score >= 70 ? "III" : score >= 50 ? "II" : "I"} - ${buildRiskLevel(score)} potencial poluidor`;
}

function buildDefaultStrategy() {
  return DEFAULT_STRATEGY.map((item) => ({ ...item }));
}

export function buildStandaloneDiagnosisSeed(answers: DiagnosticAnswers): CanonicalDiagnosisPayload {
  let score = 30;
  const obligations: string[] = [];
  const services: string[] = [];

  if (answers.captacao === "sim") {
    score += 10;
    obligations.push("Outorga de Uso de Agua");
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
    services.push("Elaboracao de PGRS");
  }
  if (answers.perigosos === "sim") {
    score += 12;
    obligations.push("Gestao de Residuos Perigosos");
    services.push("Gestao de Residuos Classe I");
  }
  if (answers.emissoes_atm === "sim") {
    score += 8;
    obligations.push("Controle de Emissoes");
    services.push("Controle de Emissoes Atmosfericas");
  }
  if (answers.passivo === "sim") {
    score += 15;
    obligations.push("Remediacao de Passivo");
    services.push("Investigacao de Passivo Ambiental");
  }
  if (answers.licenca === "nao") {
    score += 10;
    obligations.push("Licenciamento Ambiental");
    services.push("Licenciamento Ambiental - Processo LO");
  }
  if (answers.app === "sim") {
    score += 8;
    obligations.push("Adequacao APP");
    services.push("Adequacao Ambiental APP");
  }
  if (answers.area_sensivel === "sim") score += 7;
  if (answers.pendencia_doc === "sim") {
    score += 5;
    obligations.push("Regularizacao Documental");
    services.push("Regularizacao Documental");
  }

  if (!obligations.length) {
    obligations.push("Licenciamento Ambiental", "Cadastro Tecnico Federal");
    services.push("Licenciamento Ambiental - Processo LO", "Cadastro Tecnico Federal");
  }

  score = Math.min(score, 100);
  const riskLevel = buildRiskLevel(score);
  const serviceComplexity = 1.0 + (score >= 70 ? 0.4 : 0.1);

  return {
    risk_score: score,
    risk_level: riskLevel,
    classe_impacto: buildImpactClass(score),
    orgao_licenciador: "Orgao Estadual (SEMAD/CETESB/INEA)",
    tipo_licenciamento: score >= 70
      ? "Licenciamento Trifasico (LP, LI, LO)"
      : "Licenciamento Simplificado",
    obrigacoes: obligations.map((obrigacao) => ({
      nome: obrigacao,
      base_legal: "Legislacao aplicavel",
      orgao: "Orgao competente",
      prioridade: score >= 70 ? "Alta" : "Media",
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

function buildDiagnosticProfile(context: CanonicalDiagnosisContextInput) {
  return {
    empreendimento: context.empresaNome || "Empreendimento",
    cliente: context.clienteNome || "Nao informado",
    cnae: context.empresaCnae || "Nao informado",
    situacao: context.statusEmp || "Nao informado",
    porte: context.porte || "",
    local: [context.municipio, context.estado].filter(Boolean).join("/") || "Nao informado",
  };
}

function buildDiagnosticClassification(
  result: CanonicalDiagnosisPayload,
  answers: DiagnosticAnswers,
) {
  return {
    classe_impacto: result.classe_impacto,
    tipo_licenciamento: result.tipo_licenciamento,
    orgao_licenciador: result.orgao_licenciador,
    potencial_poluidor: derivePotentialPoluidor(answers, result.risk_score),
  };
}

function buildDiagnosticNeeds(
  result: CanonicalDiagnosisPayload,
  answers: DiagnosticAnswers,
) {
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

function buildRiskFactors(params: {
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

function inferLicensingAgency(state: string) {
  const uf = normalize(state).toUpperCase();
  const agencies: Record<string, string> = {
    GO: "SEMAD/GO",
    MG: "SEMAD/MG",
    SP: "CETESB",
    MT: "SEMA/MT",
    MS: "IMASUL",
    DF: "IBRAM/DF",
    RJ: "INEA",
  };
  return agencies[uf] || "Orgao ambiental estadual competente";
}

function inferLicensingType(score: number, input: OfficialDiagnosticInput) {
  const hasPassivo = input.answers.passivo === "sim";
  const hasSensitiveArea = input.answers.app === "sim" || input.answers.area_sensivel === "sim";
  const hasOperation = normalize(input.enterpriseStatus) === "em_operacao";

  if (hasPassivo || score >= 70) return "Licenciamento trifasico (LP, LI, LO)";
  if (hasSensitiveArea || hasOperation) return "Licenciamento corretivo ou ordinario";
  return "Licenciamento simplificado";
}

function buildObligations(input: OfficialDiagnosticInput, score: number): OfficialDerivedObligation[] {
  const obligations: OfficialDerivedObligation[] = [];

  function pushObligation(
    title: string,
    legalBasis: string,
    agency: string,
    priority: "Alta" | "Media" | "Baixa",
    reason: string,
  ) {
    obligations.push({
      code: slug(title),
      title,
      legalBasis,
      agency,
      priority,
      status: "identificada",
      reason,
    });
  }

  const agency = inferLicensingAgency(input.state);

  if (input.answers.licenca === "nao") {
    pushObligation("Licenciamento ambiental", "Legislacao estadual e resolucoes CONAMA aplicaveis", agency, "Alta", "Empreendimento sem licenca ambiental vigente.");
  }
  if (input.answers.captacao === "sim") {
    pushObligation("Outorga de uso de recursos hidricos", "Politica Nacional de Recursos Hidricos e norma estadual correlata", "Orgao gestor hidrico competente", "Alta", "Ha indicio de captacao ou uso relevante de agua.");
  }
  if (input.answers.efluentes === "sim") {
    pushObligation("Controle e monitoramento de efluentes", "Normas de lancamento de efluentes e condicionantes ambientais", agency, score >= 70 ? "Alta" : "Media", "Ha geracao ou lancamento de efluentes.");
  }
  if (input.answers.gera_residuos === "sim") {
    pushObligation("Plano de gerenciamento de residuos", "PNRS e regulamentos ambientais aplicaveis", agency, "Media", "Ha geracao de residuos na operacao.");
  }
  if (input.answers.perigosos === "sim") {
    pushObligation("Gestao de residuos perigosos", "Normas de armazenamento, transporte e destinacao de residuos perigosos", agency, "Alta", "Foram declarados residuos perigosos.");
  }
  if (input.answers.emissoes_atm === "sim") {
    pushObligation("Controle de emissoes atmosfericas", "Padroes de emissao e condicionantes atmosfericas", agency, score >= 70 ? "Alta" : "Media", "Ha fonte potencial de emissao atmosferica.");
  }
  if (input.answers.app === "sim" || input.answers.area_sensivel === "sim") {
    pushObligation("Avaliacao de sensibilidade territorial e APP", "Codigo Florestal e normas territoriais aplicaveis", agency, "Alta", "O caso indica area sensivel ou interferencia em APP.");
  }
  if (input.answers.pendencia_doc === "sim") {
    pushObligation("Regularizacao documental", "Exigencias cadastrais e documentais do processo ambiental", agency, "Media", "Existem pendencias documentais declaradas.");
  }
  if (normalize(input.diagnosisType) === "pgrss") {
    pushObligation("Plano de gerenciamento de residuos de servicos de saude", "RDC ANVISA e normas locais de residuos de saude", "Vigilancia Sanitaria e orgao ambiental competente", "Alta", "O tipo de diagnostico exige foco em PGRSS.");
  }
  if (!obligations.length) {
    pushObligation("Cadastro tecnico e enquadramento inicial", "Base regulatoria minima aplicavel ao empreendimento", agency, "Baixa", "Cenario de menor criticidade, com necessidade de enquadramento inicial.");
  }

  return obligations;
}

const SERVICE_CATALOG: Record<string, { title: string; category: string; hours: number; rate: number }> = {
  licenciamento_ambiental: { title: "Conducao de licenciamento ambiental", category: "licenciamento", hours: 42, rate: 220 },
  outorga_de_uso_de_recursos_hidricos: { title: "Processo de outorga hidrica", category: "recursos_hidricos", hours: 28, rate: 220 },
  controle_e_monitoramento_de_efluentes: { title: "Plano de controle de efluentes", category: "monitoramento", hours: 24, rate: 210 },
  plano_de_gerenciamento_de_residuos: { title: "Elaboracao de plano de gerenciamento de residuos", category: "residuos", hours: 20, rate: 210 },
  gestao_de_residuos_perigosos: { title: "Programa de gestao de residuos perigosos", category: "residuos", hours: 26, rate: 220 },
  controle_de_emissoes_atmosfericas: { title: "Programa de controle de emissoes atmosfericas", category: "emissoes", hours: 24, rate: 215 },
  avaliacao_de_sensibilidade_territorial_e_app: { title: "Avaliacao territorial e de APP", category: "territorial", hours: 30, rate: 230 },
  regularizacao_documental: { title: "Regularizacao documental do empreendimento", category: "documental", hours: 16, rate: 180 },
  plano_de_gerenciamento_de_residuos_de_servicos_de_saude: { title: "Elaboracao de PGRSS", category: "residuos_saude", hours: 24, rate: 220 },
  cadastro_tecnico_e_enquadramento_inicial: { title: "Enquadramento e cadastro tecnico inicial", category: "enquadramento", hours: 12, rate: 180 },
};

function buildServices(obligations: OfficialDerivedObligation[], score: number): OfficialDerivedService[] {
  const complexityFactor = score >= 70 ? 1.4 : score >= 50 ? 1.15 : 1;

  return obligations.map((obligation) => {
    const item = SERVICE_CATALOG[obligation.code] || {
      title: `Servico tecnico para ${obligation.title}`,
      category: "consultoria",
      hours: 18,
      rate: 200,
    };

    const total = Math.round(item.hours * item.rate * complexityFactor);
    return {
      code: `svc_${obligation.code}`,
      title: item.title,
      category: item.category,
      estimatedHours: item.hours,
      hourlyRate: item.rate,
      complexityFactor,
      total,
      linkedObligationCode: obligation.code,
    };
  });
}

function buildStrategy(obligations: OfficialDerivedObligation[], score: number): OfficialStrategyMilestone[] {
  const hasHighPriority = obligations.some((item) => item.priority === "Alta");
  const base: OfficialStrategyMilestone[] = [
    { order: 1, title: "Consolidar prova e briefing", description: "Fechar contexto minimo, documentos e enquadramento inicial do caso.", expectedDays: 7 },
    { order: 2, title: "Executar regularizacao prioritaria", description: hasHighPriority ? "Atacar primeiro as obrigacoes criticas e de maior exposicao regulatoria." : "Conduzir as obrigacoes iniciais por ordem de aderencia regulatoria.", expectedDays: score >= 70 ? 30 : 21 },
    { order: 3, title: "Estruturar programas e monitoramentos", description: "Desdobrar a regularizacao em rotinas, evidencias e controles continuos.", expectedDays: score >= 70 ? 60 : 45 },
  ];

  if (score >= 70) {
    base.push({ order: 4, title: "Plano de resposta regulatoria", description: "Preparar trilha de resposta para fiscalizacao, passivo ou exigencia externa.", expectedDays: 15 });
  }
  return base;
}

function buildSignals(input: OfficialDiagnosticInput, score: number, obligations: OfficialDerivedObligation[]) {
  const signals: string[] = [];
  if (score >= 70) signals.push("Risco regulatorio alto com necessidade de conducao tecnica prioritaria.");
  if (input.answers.passivo === "sim") signals.push("Existe indicio de passivo ambiental declarado.");
  if (input.answers.licenca === "nao") signals.push("Nao ha licenca ambiental vigente informada.");
  if (normalize(input.knownConstraints).includes("fiscalizacao")) signals.push("O caso menciona fiscalizacao ou pressao externa.");
  if (obligations.length >= 5) signals.push("O caso ja nasce com alta densidade de obrigacoes derivadas.");
  return signals;
}

export function buildOfficialDiagnosticResult(input: OfficialDiagnosticInput): OfficialDiagnosticResult {
  const riskScore = computeRiskScore(input.answers);
  const riskLevel = buildRiskLevel(riskScore);
  const impactClass = buildImpactClass(riskScore);
  const licensingAgency = inferLicensingAgency(input.state);
  const licensingType = inferLicensingType(riskScore, input);
  const pollutionPotential = derivePotentialPoluidor(input.answers, riskScore);
  const obligations = buildObligations(input, riskScore);
  const services = buildServices(obligations, riskScore);
  const strategy = buildStrategy(obligations, riskScore);
  const signals = buildSignals(input, riskScore, obligations);

  return {
    profile: buildDiagnosticProfile({
      empresaNome: input.companyName,
      clienteNome: input.clientName,
      empresaCnae: input.cnae,
      municipio: input.municipality,
      estado: input.state,
      statusEmp: input.enterpriseStatus,
      porte: input.enterpriseSize,
    }),
    riskScore,
    riskLevel,
    impactClass,
    licensingType,
    licensingAgency,
    pollutionPotential,
    executionMode: riskScore >= 70 ? "manual" : "hybrid",
    obligations,
    services,
    strategy,
    signals,
  };
}

function mapPriority(priority: "Alta" | "Media" | "Baixa"): OfficialExecutionTaskPriority {
  if (priority === "Alta") return "alta";
  if (priority === "Media") return "media";
  return "baixa";
}

function buildPhases(): OfficialExecutionPhase[] {
  return [
    { code: "diagnostico", title: "Diagnostico consolidado", description: "Fechar leitura tecnica, contexto e base probatoria do caso.", order: 1 },
    { code: "regularizacao", title: "Regularizacao prioritaria", description: "Atacar exigencias, licencas e pendencias de maior exposicao regulatoria.", order: 2 },
    { code: "implantacao", title: "Implantacao de controles", description: "Desdobrar o diagnostico em rotinas, evidencias e programas ambientais.", order: 3 },
    { code: "monitoramento", title: "Monitoramento continuo", description: "Sustentar a operacao com recorrencias, prazos e comprovacao tecnica.", order: 4 },
  ];
}

function inferOwner(obligation: OfficialDerivedObligation) {
  if (obligation.title.toLowerCase().includes("outorga")) return "Especialista hidrico";
  if (obligation.title.toLowerCase().includes("residu")) return "Especialista residuos";
  if (obligation.title.toLowerCase().includes("emisso")) return "Especialista monitoramento";
  return "Analista ambiental";
}

function inferExpectedDays(obligation: OfficialDerivedObligation, riskScore: number) {
  const base = obligation.priority === "Alta" ? 15 : obligation.priority === "Media" ? 30 : 45;
  return riskScore >= 70 ? Math.max(7, base - 5) : base;
}

function inferPhase(obligation: OfficialDerivedObligation): OfficialExecutionPhaseName {
  const normalized = obligation.title.toLowerCase();
  if (normalized.includes("licenciamento") || normalized.includes("outorga") || normalized.includes("regularizacao")) return "regularizacao";
  if (normalized.includes("plano") || normalized.includes("gestao") || normalized.includes("controle")) return "implantacao";
  if (normalized.includes("monitoramento") || normalized.includes("emissoes") || normalized.includes("efluentes")) return "monitoramento";
  return "diagnostico";
}

function buildTasks(result: OfficialDiagnosticResult): OfficialExecutionTask[] {
  const tasks: OfficialExecutionTask[] = [
    {
      code: "task_consolidar_diagnostico",
      title: "Consolidar diagnostico oficial",
      description: "Fechar leitura tecnica, enquadramento e plano inicial do caso.",
      phaseCode: "diagnostico",
      priority: result.riskScore >= 70 ? "critica" : "alta",
      status: "pendente",
      owner: "Analista responsavel",
      expectedDays: 5,
      obligationCode: null,
      serviceCode: null,
    },
  ];

  result.obligations.forEach((obligation) => {
    const service = result.services.find((item) => item.linkedObligationCode === obligation.code);
    tasks.push({
      code: `task_${obligation.code}`,
      title: obligation.title,
      description: obligation.reason,
      phaseCode: inferPhase(obligation),
      priority: mapPriority(obligation.priority),
      status: "pendente",
      owner: inferOwner(obligation),
      expectedDays: inferExpectedDays(obligation, result.riskScore),
      obligationCode: obligation.code,
      serviceCode: service?.code ?? null,
    });
  });
  return tasks;
}

function buildDeadlines(tasks: OfficialExecutionTask[]): OfficialExecutionDeadline[] {
  return tasks
    .filter((task) => task.phaseCode !== "diagnostico")
    .map((task) => ({
      code: `deadline_${task.code}`,
      title: `Prazo de ${task.title}`,
      dueInDays: task.expectedDays,
      priority: task.priority,
      linkedTaskCode: task.code,
      recurring: task.phaseCode === "monitoramento",
    }));
}

function inferMonitoringPeriodicity(obligation: OfficialDerivedObligation): OfficialExecutionMonitoring["periodicity"] {
  const normalized = `${obligation.title} ${obligation.legalBasis}`.toLowerCase();
  if (normalized.includes("trimestral")) return "trimestral";
  if (normalized.includes("semestral")) return "semestral";
  if (normalized.includes("mensal")) return "mensal";
  if (normalized.includes("anual") || normalized.includes("pgrs") || normalized.includes("ctf")) return "anual";
  return "sob_demanda";
}

function buildMonitorings(result: OfficialDiagnosticResult): OfficialExecutionMonitoring[] {
  return result.obligations
    .filter((obligation) => {
      const normalized = obligation.title.toLowerCase();
      return normalized.includes("monitoramento") || normalized.includes("efluentes") || normalized.includes("emissoes") || normalized.includes("residuos");
    })
    .map((obligation) => ({
      code: `monitoring_${slug(obligation.title)}`,
      title: `Monitorar ${obligation.title}`,
      periodicity: inferMonitoringPeriodicity(obligation),
      owner: inferOwner(obligation),
      linkedObligationCode: obligation.code,
      requiresEvidence: true,
    }));
}

export function buildOfficialExecutionPlan(result: OfficialDiagnosticResult): OfficialExecutionPlan {
  const phases = buildPhases();
  const tasks = buildTasks(result);
  const deadlines = buildDeadlines(tasks);
  const monitorings = buildMonitorings(result);

  return {
    summary: {
      totalPhases: phases.length,
      totalTasks: tasks.length,
      totalDeadlines: deadlines.length,
      totalMonitorings: monitorings.length,
    },
    phases,
    tasks,
    deadlines,
    monitorings,
  };
}
