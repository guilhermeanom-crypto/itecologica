import type {
  OfficialDerivedObligation,
  OfficialDiagnosticResult,
  OfficialExecutionDeadline,
  OfficialExecutionMonitoring,
  OfficialExecutionPhase,
  OfficialExecutionPhaseName,
  OfficialExecutionPlan,
  OfficialExecutionTask,
  OfficialExecutionTaskPriority,
} from "./types.ts";

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapPriority(priority: "Alta" | "Média" | "Baixa"): OfficialExecutionTaskPriority {
  if (priority === "Alta") return "alta";
  if (priority === "Média") return "media";
  return "baixa";
}

function buildPhases(): OfficialExecutionPhase[] {
  return [
    {
      code: "diagnostico",
      title: "Diagnostico consolidado",
      description: "Fechar leitura tecnica, contexto e base probatoria do caso.",
      order: 1,
    },
    {
      code: "regularizacao",
      title: "Regularizacao prioritaria",
      description: "Atacar exigencias, licencas e pendencias de maior exposicao regulatoria.",
      order: 2,
    },
    {
      code: "implantacao",
      title: "Implantacao de controles",
      description: "Desdobrar o diagnostico em rotinas, evidencias e programas ambientais.",
      order: 3,
    },
    {
      code: "monitoramento",
      title: "Monitoramento continuo",
      description: "Sustentar a operacao com recorrencias, prazos e comprovacao tecnica.",
      order: 4,
    },
  ];
}

function inferOwner(obligation: OfficialDerivedObligation) {
  if (obligation.title.toLowerCase().includes("outorga")) return "Especialista hidrico";
  if (obligation.title.toLowerCase().includes("residu")) return "Especialista residuos";
  if (obligation.title.toLowerCase().includes("emisso")) return "Especialista monitoramento";
  return "Analista ambiental";
}

function inferExpectedDays(obligation: OfficialDerivedObligation, riskScore: number) {
  const base = obligation.priority === "Alta" ? 15 : obligation.priority === "Média" ? 30 : 45;
  return riskScore >= 70 ? Math.max(7, base - 5) : base;
}

function inferPhase(obligation: OfficialDerivedObligation): OfficialExecutionPhaseName {
  const normalized = obligation.title.toLowerCase();

  if (
    normalized.includes("licenciamento") ||
    normalized.includes("outorga") ||
    normalized.includes("regularizacao")
  ) {
    return "regularizacao";
  }

  if (
    normalized.includes("plano") ||
    normalized.includes("gestao") ||
    normalized.includes("controle")
  ) {
    return "implantacao";
  }

  if (
    normalized.includes("monitoramento") ||
    normalized.includes("emissoes") ||
    normalized.includes("efluentes")
  ) {
    return "monitoramento";
  }

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
    .map((task, index) => ({
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
      return (
        normalized.includes("monitoramento") ||
        normalized.includes("efluentes") ||
        normalized.includes("emissoes") ||
        normalized.includes("residuos")
      );
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
