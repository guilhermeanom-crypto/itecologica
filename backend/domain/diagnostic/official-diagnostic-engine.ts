import {
  buildDiagnosticProfile,
  buildImpactClass,
  buildRiskLevel,
  computeRiskScore,
  derivePotentialPoluidor,
} from "./canonical-diagnostic.ts";
import type {
  OfficialDerivedObligation,
  OfficialDerivedService,
  OfficialDiagnosticInput,
  OfficialDiagnosticResult,
  OfficialStrategyMilestone,
} from "./types.ts";

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

  if (hasPassivo || score >= 70) {
    return "Licenciamento trifasico (LP, LI, LO)";
  }

  if (hasSensitiveArea || hasOperation) {
    return "Licenciamento corretivo ou ordinario";
  }

  return "Licenciamento simplificado";
}

function buildObligations(input: OfficialDiagnosticInput, score: number): OfficialDerivedObligation[] {
  const obligations: OfficialDerivedObligation[] = [];

  function pushObligation(
    title: string,
    legalBasis: string,
    agency: string,
    priority: "Alta" | "Média" | "Baixa",
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
    pushObligation(
      "Licenciamento ambiental",
      "Legislacao estadual e resolucoes CONAMA aplicaveis",
      agency,
      "Alta",
      "Empreendimento sem licenca ambiental vigente.",
    );
  }

  if (input.answers.captacao === "sim") {
    pushObligation(
      "Outorga de uso de recursos hidricos",
      "Politica Nacional de Recursos Hidricos e norma estadual correlata",
      "Orgao gestor hidrico competente",
      "Alta",
      "Ha indicio de captacao ou uso relevante de agua.",
    );
  }

  if (input.answers.efluentes === "sim") {
    pushObligation(
      "Controle e monitoramento de efluentes",
      "Normas de lancamento de efluentes e condicionantes ambientais",
      agency,
      score >= 70 ? "Alta" : "Média",
      "Ha geracao ou lancamento de efluentes.",
    );
  }

  if (input.answers.gera_residuos === "sim") {
    pushObligation(
      "Plano de gerenciamento de residuos",
      "PNRS e regulamentos ambientais aplicaveis",
      agency,
      "Média",
      "Ha geracao de residuos na operacao.",
    );
  }

  if (input.answers.perigosos === "sim") {
    pushObligation(
      "Gestao de residuos perigosos",
      "Normas de armazenamento, transporte e destinacao de residuos perigosos",
      agency,
      "Alta",
      "Foram declarados residuos perigosos.",
    );
  }

  if (input.answers.emissoes_atm === "sim") {
    pushObligation(
      "Controle de emissoes atmosfericas",
      "Padroes de emissao e condicionantes atmosfericas",
      agency,
      score >= 70 ? "Alta" : "Média",
      "Ha fonte potencial de emissao atmosferica.",
    );
  }

  if (input.answers.app === "sim" || input.answers.area_sensivel === "sim") {
    pushObligation(
      "Avaliacao de sensibilidade territorial e APP",
      "Codigo Florestal e normas territoriais aplicaveis",
      agency,
      "Alta",
      "O caso indica area sensivel ou interferencia em APP.",
    );
  }

  if (input.answers.pendencia_doc === "sim") {
    pushObligation(
      "Regularizacao documental",
      "Exigencias cadastrais e documentais do processo ambiental",
      agency,
      "Média",
      "Existem pendencias documentais declaradas.",
    );
  }

  if (normalize(input.diagnosisType) === "pgrss") {
    pushObligation(
      "Plano de gerenciamento de residuos de servicos de saude",
      "RDC ANVISA e normas locais de residuos de saude",
      "Vigilancia Sanitaria e orgao ambiental competente",
      "Alta",
      "O tipo de diagnostico exige foco em PGRSS.",
    );
  }

  if (!obligations.length) {
    pushObligation(
      "Cadastro tecnico e enquadramento inicial",
      "Base regulatoria minima aplicavel ao empreendimento",
      agency,
      "Baixa",
      "Cenario de menor criticidade, com necessidade de enquadramento inicial.",
    );
  }

  return obligations;
}

const SERVICE_CATALOG: Record<string, { title: string; category: string; hours: number; rate: number }> = {
  licenciamento_ambiental: {
    title: "Conducao de licenciamento ambiental",
    category: "licenciamento",
    hours: 42,
    rate: 220,
  },
  outorga_de_uso_de_recursos_hidricos: {
    title: "Processo de outorga hidrica",
    category: "recursos_hidricos",
    hours: 28,
    rate: 220,
  },
  controle_e_monitoramento_de_efluentes: {
    title: "Plano de controle de efluentes",
    category: "monitoramento",
    hours: 24,
    rate: 210,
  },
  plano_de_gerenciamento_de_residuos: {
    title: "Elaboracao de plano de gerenciamento de residuos",
    category: "residuos",
    hours: 20,
    rate: 210,
  },
  gestao_de_residuos_perigosos: {
    title: "Programa de gestao de residuos perigosos",
    category: "residuos",
    hours: 26,
    rate: 220,
  },
  controle_de_emissoes_atmosfericas: {
    title: "Programa de controle de emissoes atmosfericas",
    category: "emissoes",
    hours: 24,
    rate: 215,
  },
  avaliacao_de_sensibilidade_territorial_e_app: {
    title: "Avaliacao territorial e de APP",
    category: "territorial",
    hours: 30,
    rate: 230,
  },
  regularizacao_documental: {
    title: "Regularizacao documental do empreendimento",
    category: "documental",
    hours: 16,
    rate: 180,
  },
  plano_de_gerenciamento_de_residuos_de_servicos_de_saude: {
    title: "Elaboracao de PGRSS",
    category: "residuos_saude",
    hours: 24,
    rate: 220,
  },
  cadastro_tecnico_e_enquadramento_inicial: {
    title: "Enquadramento e cadastro tecnico inicial",
    category: "enquadramento",
    hours: 12,
    rate: 180,
  },
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
    {
      order: 1,
      title: "Consolidar prova e briefing",
      description: "Fechar contexto minimo, documentos e enquadramento inicial do caso.",
      expectedDays: 7,
    },
    {
      order: 2,
      title: "Executar regularizacao prioritaria",
      description: hasHighPriority
        ? "Atacar primeiro as obrigacoes criticas e de maior exposicao regulatoria."
        : "Conduzir as obrigacoes iniciais por ordem de aderencia regulatoria.",
      expectedDays: score >= 70 ? 30 : 21,
    },
    {
      order: 3,
      title: "Estruturar programas e monitoramentos",
      description: "Desdobrar a regularizacao em rotinas, evidencias e controles continuos.",
      expectedDays: score >= 70 ? 60 : 45,
    },
  ];

  if (score >= 70) {
    base.push({
      order: 4,
      title: "Plano de resposta regulatoria",
      description: "Preparar trilha de resposta para fiscalizacao, passivo ou exigencia externa.",
      expectedDays: 15,
    });
  }

  return base;
}

function buildSignals(input: OfficialDiagnosticInput, score: number, obligations: OfficialDerivedObligation[]) {
  const signals: string[] = [];

  if (score >= 70) {
    signals.push("Risco regulatorio alto com necessidade de conducao tecnica prioritaria.");
  }
  if (input.answers.passivo === "sim") {
    signals.push("Existe indicio de passivo ambiental declarado.");
  }
  if (input.answers.licenca === "nao") {
    signals.push("Nao ha licenca ambiental vigente informada.");
  }
  if (normalize(input.knownConstraints).includes("fiscalizacao")) {
    signals.push("O caso menciona fiscalizacao ou pressao externa.");
  }
  if (obligations.length >= 5) {
    signals.push("O caso ja nasce com alta densidade de obrigacoes derivadas.");
  }

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
    executionMode: riskScore >= 50 ? "hybrid" : "manual",
    obligations,
    services,
    strategy,
    signals,
  };
}
