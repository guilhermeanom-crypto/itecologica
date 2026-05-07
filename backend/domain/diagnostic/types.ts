export type DiagnosisType =
  | "regularizacao_ambiental"
  | "mapeamento_normativo_territorial"
  | "pgrss"
  | "estanqueidade"
  | "logistica_reversa"
  | "posto_gestao_ambiental"
  | (string & {});

export type DiagnosisPriority = "low" | "normal" | "high" | "critical";

export type DiagnosisCaseStatus =
  | "draft"
  | "collecting_inputs"
  | "ready_to_run"
  | "running"
  | "awaiting_human_review"
  | "approved"
  | "rejected"
  | "archived";

export type DiagnosisRunStatus =
  | "queued"
  | "running_agent_01"
  | "running_agent_02"
  | "running_agent_04"
  | "running_agent_03"
  | "awaiting_outputs"
  | "awaiting_human_review"
  | "completed"
  | "failed"
  | "cancelled";

export type DiagnosisStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type HabilisStepCode =
  | "agent_01"
  | "agent_02"
  | "agent_04"
  | "agent_03";

export type AnalystStageId =
  | "handoff"
  | "briefing"
  | "documents"
  | "ready_to_run"
  | "execution"
  | "human_review"
  | "closure";

export interface DiagnosisLeadContext {
  id: string | null;
  company: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  need: string | null;
  urgency: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
}

export interface DiagnosisInputSnapshot {
  caseId: string | null;
  versionNumber: number | null;
  theme: string | null;
  territorialScope: string | null;
  customerContext: string | null;
  declaredNeed: string | null;
  knownConstraints: string | null;
  jsonPayload: Record<string, unknown>;
}

export interface DiagnosisDocumentSnapshot {
  id: string;
  fileName: string;
  filePath: string;
  documentType: string | null;
  ocrStatus: string | null;
}

export interface DiagnosisStepSnapshot {
  code: HabilisStepCode;
  order: number;
  status: DiagnosisStepStatus;
  outputPayload: Record<string, unknown>;
  errorMessage: string | null;
}

export interface DiagnosisRunSnapshot {
  id: string | null;
  runNumber: number | null;
  status: DiagnosisRunStatus | null;
  executionMode: "manual" | "hybrid" | "automated" | null;
  modelProvider: string | null;
  modelName: string | null;
  finalOutput: Record<string, unknown>;
}

export interface DiagnosisCaseSnapshot {
  id: string;
  diagnosisType: DiagnosisType;
  title: string;
  status: DiagnosisCaseStatus;
  priority: DiagnosisPriority;
  assignedTo: string | null;
  briefingSummary: string | null;
  humanReviewRequired: boolean;
  lead: DiagnosisLeadContext;
  input: DiagnosisInputSnapshot | null;
  documents: DiagnosisDocumentSnapshot[];
  run: DiagnosisRunSnapshot | null;
  steps: DiagnosisStepSnapshot[];
}

export interface AnalystStageDefinition {
  id: AnalystStageId;
  label: string;
  description: string;
  caseStatuses: DiagnosisCaseStatus[];
}

export interface ReadinessCheck {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface ReadinessReport {
  ready: boolean;
  score: number;
  missing: string[];
  checks: ReadinessCheck[];
}

export interface DecisionSignal {
  severity: "info" | "warning" | "critical";
  code: string;
  title: string;
  detail: string;
}

export interface ExecutionRecommendation {
  priority: DiagnosisPriority;
  executionMode: "manual" | "hybrid" | "automated";
  recommendedNextAction: string;
  signals: DecisionSignal[];
}

export type CanonicalDiagnosisSource =
  | "analyst_area"
  | "standalone"
  | "pipeline_habilis";

export type PollutionPotential = "alto" | "medio" | "baixo";

export interface DiagnosticAnswers {
  [key: string]: string;
}

export interface CanonicalDiagnosisMeta {
  status: "iniciado" | "em_andamento" | "concluido";
  source: CanonicalDiagnosisSource;
  generated_at: string;
  completed_at?: string;
  case_id?: string | null;
  lead_id?: string | null;
  run_id?: string | null;
  empreendimento_nome?: string;
  cnae?: string | null;
}

export interface CanonicalDiagnosticProfile {
  empreendimento: string;
  cliente: string;
  cnae: string;
  situacao: string;
  porte?: string;
  local: string;
  area?: string;
}

export interface CanonicalDiagnosticClassification {
  classe_impacto: string;
  tipo_licenciamento: string;
  orgao_licenciador: string;
  potencial_poluidor: PollutionPotential;
}

export interface CanonicalDiagnosticNeeds {
  estudos_ambientais: boolean;
  outorga_hidrica: boolean;
  logistica_reversa: boolean;
  cadastro_tecnico_federal: boolean;
  programas_ambientais: boolean;
  monitoramento: boolean;
}

export interface CanonicalObligation {
  nome: string;
  base_legal: string;
  orgao: string;
  prioridade: "Alta" | "Média" | "Baixa";
  status: string;
}

export interface CanonicalRecommendedService {
  servico_id: string;
  servico_nome: string;
  horas: number;
  valor_hora: number;
  complexidade: number;
  total: number;
}

export interface CanonicalStrategyStep {
  etapa: number;
  titulo: string;
  descricao: string;
  prazo: string;
  progresso: number;
}

export interface CanonicalDiagnosisPayload {
  risk_score: number;
  risk_level: string;
  classe_impacto: string;
  orgao_licenciador: string;
  tipo_licenciamento: string;
  meta?: CanonicalDiagnosisMeta;
  perfil_diagnostico?: CanonicalDiagnosticProfile;
  classificacao_detalhada?: CanonicalDiagnosticClassification;
  necessidades?: CanonicalDiagnosticNeeds;
  fatores_risco?: string[];
  obrigacoes: CanonicalObligation[];
  servicos_recomendados: CanonicalRecommendedService[];
  estrategia: CanonicalStrategyStep[];
}

export interface CanonicalDiagnosisContextInput {
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
}

export interface OfficialDiagnosticInput {
  diagnosisType: DiagnosisType;
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
}

export interface OfficialDerivedObligation {
  code: string;
  title: string;
  legalBasis: string;
  agency: string;
  priority: "Alta" | "Média" | "Baixa";
  status: "identificada";
  reason: string;
}

export interface OfficialDerivedService {
  code: string;
  title: string;
  category: string;
  estimatedHours: number;
  hourlyRate: number;
  complexityFactor: number;
  total: number;
  linkedObligationCode: string;
}

export interface OfficialStrategyMilestone {
  order: number;
  title: string;
  description: string;
  expectedDays: number;
}

export interface OfficialDiagnosticResult {
  profile: CanonicalDiagnosticProfile;
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
}

export type OfficialExecutionPhaseName =
  | "diagnostico"
  | "regularizacao"
  | "implantacao"
  | "monitoramento";

export type OfficialExecutionTaskPriority = "critica" | "alta" | "media" | "baixa";
export type OfficialExecutionTaskStatus = "pendente" | "em_andamento" | "concluida" | "bloqueada";

export interface OfficialExecutionPhase {
  code: OfficialExecutionPhaseName;
  title: string;
  description: string;
  order: number;
}

export interface OfficialExecutionTask {
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
}

export interface OfficialExecutionDeadline {
  code: string;
  title: string;
  dueInDays: number;
  priority: OfficialExecutionTaskPriority;
  linkedTaskCode: string;
  recurring: boolean;
}

export interface OfficialExecutionMonitoring {
  code: string;
  title: string;
  periodicity: "mensal" | "trimestral" | "semestral" | "anual" | "sob_demanda";
  owner: string;
  linkedObligationCode?: string | null;
  requiresEvidence: boolean;
}

export interface OfficialExecutionPlan {
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
}
