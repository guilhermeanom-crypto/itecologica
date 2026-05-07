import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.ITECOLOGICA_ANALISTA_CONFIG || {};
const bootParams = new URLSearchParams(window.location.search);
let bootCaseId = bootParams.get("case_id") || "";

const loginPanel = document.getElementById("login-panel");
const appPanel = document.getElementById("app-panel");
const loginForm = document.getElementById("login-form");
const loginFeedback = document.getElementById("login-feedback");
const signoutButton = document.getElementById("signout-button");
const sessionBadge = document.getElementById("session-badge");
const refreshButton = document.getElementById("refresh-button");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const typeFilter = document.getElementById("type-filter");
const casesList = document.getElementById("cases-list");
const queueButtons = Array.from(document.querySelectorAll("[data-queue-filter]"));

const newCaseForm = document.getElementById("new-case-form");
const newCaseFeedback = document.getElementById("new-case-feedback");
const newCaseButton = document.getElementById("new-case-button");

const emptyState = document.getElementById("empty-state");
const detailView = document.getElementById("detail-view");
const detailSubtitle = document.getElementById("detail-subtitle");
const caseForm = document.getElementById("case-form");
const caseFeedback = document.getElementById("case-feedback");
const saveCaseButton = document.getElementById("save-case-button");
const generateCanonicalButton = document.getElementById("generate-canonical-button");
const prepareRunButton = document.getElementById("prepare-run-button");
const canonicalSummary = document.getElementById("canonical-summary");
const canonicalPayload = document.getElementById("canonical-payload");
const canonicalFeedback = document.getElementById("canonical-feedback");
const officialDiagnosticSummary = document.getElementById("official-diagnostic-summary");
const officialDiagnosticPayload = document.getElementById("official-diagnostic-payload");
const officialExecutionSummary = document.getElementById("official-execution-summary");
const officialExecutionPayload = document.getElementById("official-execution-payload");
const runSubtitle = document.getElementById("run-subtitle");
const runSummary = document.getElementById("run-summary");
const stepsList = document.getElementById("steps-list");
const runFinalOutput = document.getElementById("run-final-output");
const reviewSummary = document.getElementById("review-summary");
const reviewFeedback = document.getElementById("review-feedback");
const approveCaseButton = document.getElementById("approve-case-button");
const rejectCaseButton = document.getElementById("reject-case-button");
const reopenCaseButton = document.getElementById("reopen-case-button");

const stepOutputForm = document.getElementById("step-output-form");
const stepFeedback = document.getElementById("step-feedback");
const saveStepButton = document.getElementById("save-step-button");

const statTotal = document.getElementById("stat-total");
const statCollecting = document.getElementById("stat-collecting");
const statRunning = document.getElementById("stat-running");
const statReview = document.getElementById("stat-review");
const queueReady = document.getElementById("queue-ready");
const queueRunning = document.getElementById("queue-running");
const queueReview = document.getElementById("queue-review");
const queueCritical = document.getElementById("queue-critical");

const fields = {
  caseTitle: document.getElementById("case-title"),
  caseCompany: document.getElementById("case-company"),
  caseLeadId: document.getElementById("case-lead-id"),
  caseType: document.getElementById("case-type"),
  status: document.getElementById("case-status"),
  priority: document.getElementById("case-priority"),
  assigned: document.getElementById("case-assigned"),
  theme: document.getElementById("case-theme"),
  territorialScope: document.getElementById("case-scope"),
  declaredNeed: document.getElementById("case-declared-need"),
  briefing: document.getElementById("case-briefing"),
  customerContext: document.getElementById("case-customer-context"),
  knownConstraints: document.getElementById("case-constraints"),
  demandType: document.getElementById("case-demand-type"),
  licenseStatus: document.getElementById("case-license-status"),
  licenseExpired: document.getElementById("case-license-expired"),
  expiredSince: document.getElementById("case-expired-since"),
  activeInspection: document.getElementById("case-active-inspection"),
  activeFine: document.getElementById("case-active-fine"),
  urgentDeadlineDays: document.getElementById("case-urgent-deadline-days"),
  availableDocuments: document.getElementById("case-available-documents"),
  requiredService: document.getElementById("case-required-service"),
  cnae: document.getElementById("case-cnae"),
  activityType: document.getElementById("case-activity-type"),
  probableAgency: document.getElementById("case-probable-agency"),
  leadTemperature: document.getElementById("case-lead-temperature"),
  stepCode: document.getElementById("step-code"),
  stepStatus: document.getElementById("step-status"),
  stepOutputJson: document.getElementById("step-output-json"),
  stepErrorMessage: document.getElementById("step-error-message"),
};

let supabase = null;
let session = null;
let analystUser = null;
let diagnosisCases = [];
let selectedCaseId = null;
let selectedCaseInput = null;
let selectedCaseRun = null;
let selectedCaseSteps = [];
let selectedCanonicalArtifact = null;
let selectedOfficialDiagnosticArtifact = null;
let selectedOfficialExecutionArtifact = null;
let activeQueueFilter = "";
let isSavingCase = false;
let isCreatingCase = false;
let isSavingStep = false;
let isPreparingRun = false;
let isGeneratingCanonical = false;
let isReviewingCase = false;

function setFeedback(node, message, type = "") {
  node.textContent = message;
  node.className = `feedback ${type}`.trim();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function formatEnumLabel(value) {
  return String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function stringifyJson(value) {
  if (!value || (typeof value === "object" && !Object.keys(value).length)) return "";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function parseJsonSafely(value) {
  if (!String(value || "").trim()) return {};
  return JSON.parse(value);
}

function extractObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function getQualificationQuestionnaireFromInput(inputRow) {
  const payload = extractObject(inputRow?.json_payload);
  const questionnaire = extractObject(payload.qualification_questionnaire);

  return {
    demand_type: String(questionnaire.demand_type || ""),
    license_status: String(questionnaire.license_status || ""),
    license_expired: String(questionnaire.license_expired || ""),
    expired_since: String(questionnaire.expired_since || ""),
    active_inspection: String(questionnaire.active_inspection || ""),
    active_fine: String(questionnaire.active_fine || ""),
    urgent_deadline_days: String(questionnaire.urgent_deadline_days || ""),
    available_documents: String(questionnaire.available_documents || ""),
    required_service: String(questionnaire.required_service || ""),
    cnae: String(questionnaire.cnae || ""),
    activity_type: String(questionnaire.activity_type || ""),
    probable_agency: String(questionnaire.probable_agency || ""),
    lead_temperature: String(questionnaire.lead_temperature || ""),
  };
}

function buildQualificationQuestionnairePayload() {
  return {
    demand_type: fields.demandType.value.trim(),
    license_status: fields.licenseStatus.value,
    license_expired: fields.licenseExpired.value,
    expired_since: fields.expiredSince.value.trim(),
    active_inspection: fields.activeInspection.value,
    active_fine: fields.activeFine.value,
    urgent_deadline_days: fields.urgentDeadlineDays.value.trim(),
    available_documents: fields.availableDocuments.value.trim(),
    required_service: fields.requiredService.value.trim(),
    cnae: fields.cnae.value.trim(),
    activity_type: fields.activityType.value.trim(),
    probable_agency: fields.probableAgency.value.trim(),
    lead_temperature: fields.leadTemperature.value,
  };
}

function getStatusChipClass(status) {
  return `status-pill ${String(status || "").toLowerCase()}`.trim();
}

function isCriticalCase(item) {
  return item.priority === "critical";
}

function matchesQueueFilter(item) {
  switch (activeQueueFilter) {
    case "ready_to_run":
      return item.status === "ready_to_run";
    case "running":
      return item.status === "running";
    case "awaiting_human_review":
      return item.status === "awaiting_human_review";
    case "critical":
      return isCriticalCase(item);
    default:
      return true;
  }
}

function matchesSearch(item, term) {
  if (!term) return true;
  const haystack = [
    item.title,
    item.diagnosis_type,
    item.lead_id,
    item.lead?.company,
    item.lead?.name,
  ].join(" ").toLowerCase();
  return haystack.includes(term);
}

function getFilteredCases() {
  const term = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const diagnosisType = typeFilter.value;

  return diagnosisCases.filter((item) => {
    if (status && item.status !== status) return false;
    if (diagnosisType && item.diagnosis_type !== diagnosisType) return false;
    if (!matchesQueueFilter(item)) return false;
    return matchesSearch(item, term);
  });
}

function renderStats() {
  statTotal.textContent = String(diagnosisCases.length);
  statCollecting.textContent = String(diagnosisCases.filter((item) => item.status === "collecting_inputs").length);
  statRunning.textContent = String(diagnosisCases.filter((item) => item.status === "running").length);
  statReview.textContent = String(diagnosisCases.filter((item) => item.status === "awaiting_human_review").length);

  queueReady.textContent = String(diagnosisCases.filter((item) => item.status === "ready_to_run").length);
  queueRunning.textContent = String(diagnosisCases.filter((item) => item.status === "running").length);
  queueReview.textContent = String(diagnosisCases.filter((item) => item.status === "awaiting_human_review").length);
  queueCritical.textContent = String(diagnosisCases.filter(isCriticalCase).length);
}

function renderCases() {
  const items = getFilteredCases();
  if (!items.length) {
    casesList.innerHTML = '<div class="empty-list">Nenhum caso encontrado com os filtros atuais.</div>';
    return;
  }

  casesList.innerHTML = items.map((item) => `
    <article class="case-row ${item.id === selectedCaseId ? "active" : ""}">
      <button type="button" data-case-id="${escapeHtml(item.id)}">
        <div class="case-head">
          <div>
            <h3 class="case-title">${escapeHtml(item.title)}</h3>
            <p class="case-meta">${escapeHtml(item.lead?.company || "-")} · ${escapeHtml(formatEnumLabel(item.diagnosis_type))}</p>
          </div>
          <span class="${escapeHtml(getStatusChipClass(item.status))}">${escapeHtml(formatEnumLabel(item.status))}</span>
        </div>
        <div class="case-tags">
          <span class="tag">${escapeHtml(item.priority || "normal")}</span>
          <span class="tag">${escapeHtml(item.assigned_to || "sem responsavel")}</span>
        </div>
        <p class="case-note">${escapeHtml(item.briefing_summary || "Sem resumo de briefing ainda.")}</p>
      </button>
    </article>
  `).join("");

  Array.from(casesList.querySelectorAll("[data-case-id]")).forEach((button) => {
    button.addEventListener("click", () => selectCase(button.dataset.caseId));
  });
}

async function fetchCaseInput(caseId) {
  const { data, error } = await supabase
    .from("crm_diagnosis_inputs")
    .select("*")
    .eq("case_id", caseId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function fetchCaseRun(caseRow) {
  const runId = caseRow.current_run_id || null;

  if (runId) {
    const { data, error } = await supabase
      .from("crm_diagnosis_runs")
      .select("*")
      .eq("id", runId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const { data, error } = await supabase
    .from("crm_diagnosis_runs")
    .select("*")
    .eq("case_id", caseRow.id)
    .order("run_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function fetchRunSteps(runId) {
  if (!runId) return [];
  const { data, error } = await supabase
    .from("crm_diagnosis_run_steps")
    .select("*")
    .eq("run_id", runId)
    .order("step_order", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function fetchLatestArtifact(caseId, artifactType) {
  const { data, error } = await supabase
    .from("crm_diagnosis_artifacts")
    .select("*")
    .eq("case_id", caseId)
    .eq("artifact_type", artifactType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

function renderArtifactSummary(node, fieldsToRender) {
  const rows = fieldsToRender.filter((item) => item.value !== null && item.value !== undefined && item.value !== "");
  if (!rows.length) {
    node.className = "run-summary empty-list";
    node.textContent = "Nenhum detalhe resumido disponível para este artefato.";
    return;
  }

  node.className = "run-summary";
  node.innerHTML = `
    <div class="detail-grid">
      ${rows.map((item) => `
        <div>
          <small>${escapeHtml(item.label)}</small>
          <p>${escapeHtml(String(item.value))}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function populateCaseDetail(caseRow) {
  const lead = caseRow.lead || {};
  const qualification = getQualificationQuestionnaireFromInput(selectedCaseInput);
  fields.caseTitle.textContent = caseRow.title || "-";
  fields.caseCompany.textContent = lead.company || "-";
  fields.caseLeadId.textContent = caseRow.lead_id || "-";
  fields.caseType.textContent = formatEnumLabel(caseRow.diagnosis_type);
  fields.status.value = caseRow.status || "collecting_inputs";
  fields.priority.value = caseRow.priority || "normal";
  fields.assigned.value = caseRow.assigned_to || "";
  fields.briefing.value = caseRow.briefing_summary || "";
  fields.theme.value = selectedCaseInput?.theme || "";
  fields.territorialScope.value = selectedCaseInput?.territorial_scope || "";
  fields.declaredNeed.value = selectedCaseInput?.declared_need || lead.need || "";
  fields.customerContext.value = selectedCaseInput?.customer_context || "";
  fields.knownConstraints.value = selectedCaseInput?.known_constraints || "";
  fields.demandType.value = qualification.demand_type;
  fields.licenseStatus.value = qualification.license_status;
  fields.licenseExpired.value = qualification.license_expired;
  fields.expiredSince.value = qualification.expired_since;
  fields.activeInspection.value = qualification.active_inspection;
  fields.activeFine.value = qualification.active_fine;
  fields.urgentDeadlineDays.value = qualification.urgent_deadline_days;
  fields.availableDocuments.value = qualification.available_documents;
  fields.requiredService.value = qualification.required_service;
  fields.cnae.value = qualification.cnae;
  fields.activityType.value = qualification.activity_type;
  fields.probableAgency.value = qualification.probable_agency;
  fields.leadTemperature.value = qualification.lead_temperature;

  detailSubtitle.textContent = `${lead.company || "Caso sem empresa"} · Lead ${caseRow.lead_id}`;
}

function renderCanonicalDiagnostic() {
  if (!selectedCanonicalArtifact) {
    canonicalSummary.className = "run-summary empty-list";
    canonicalSummary.textContent = "Nenhum diagnóstico canônico gerado para este caso.";
    canonicalPayload.value = "";
    return;
  }

  const metadata = selectedCanonicalArtifact.metadata || {};
  const payload = metadata.payload || {};
  const answerCount = metadata.answer_count ?? "-";
  const generatedBy = metadata.generated_by || "-";

  canonicalSummary.className = "run-summary";
  renderArtifactSummary(canonicalSummary, [
    { label: "Artefato", value: selectedCanonicalArtifact.artifact_type || "-" },
    { label: "Respostas lidas", value: String(answerCount) },
    { label: "Gerado por", value: generatedBy },
    { label: "Data", value: formatDate(selectedCanonicalArtifact.created_at) },
  ]);
  canonicalPayload.value = stringifyJson(payload);
}

function renderOfficialDiagnosticResult() {
  if (!selectedOfficialDiagnosticArtifact) {
    officialDiagnosticSummary.className = "run-summary empty-list";
    officialDiagnosticSummary.textContent = "Nenhum resultado oficial materializado para este caso.";
    officialDiagnosticPayload.value = "";
    return;
  }

  const metadata = selectedOfficialDiagnosticArtifact.metadata || {};
  const payload = metadata.payload || {};

  renderArtifactSummary(officialDiagnosticSummary, [
    { label: "Risco", value: payload.riskLevel || "-" },
    { label: "Score", value: payload.riskScore ?? "-" },
    { label: "Licenciamento", value: payload.licensingType || "-" },
    { label: "Órgão", value: payload.licensingAgency || "-" },
    { label: "Obrigações", value: Array.isArray(payload.obligations) ? payload.obligations.length : 0 },
    { label: "Serviços", value: Array.isArray(payload.services) ? payload.services.length : 0 },
  ]);

  officialDiagnosticPayload.value = stringifyJson(payload);
}

function renderOfficialExecutionPlan() {
  if (!selectedOfficialExecutionArtifact) {
    officialExecutionSummary.className = "run-summary empty-list";
    officialExecutionSummary.textContent = "Nenhum plano oficial de execução materializado para este caso.";
    officialExecutionPayload.value = "";
    return;
  }

  const metadata = selectedOfficialExecutionArtifact.metadata || {};
  const payload = metadata.payload || {};
  const summary = payload.summary || {};

  renderArtifactSummary(officialExecutionSummary, [
    { label: "Fases", value: summary.totalPhases ?? 0 },
    { label: "Tarefas", value: summary.totalTasks ?? 0 },
    { label: "Prazos", value: summary.totalDeadlines ?? 0 },
    { label: "Monitoramentos", value: summary.totalMonitorings ?? 0 },
    { label: "Gerado por", value: metadata.generated_by || "-" },
    { label: "Data", value: formatDate(selectedOfficialExecutionArtifact.created_at) },
  ]);

  officialExecutionPayload.value = stringifyJson(payload);
}

function getSelectedCaseRow() {
  return diagnosisCases.find((item) => item.id === selectedCaseId) || null;
}

function canApproveCase(caseRow) {
  return Boolean(caseRow && caseRow.status === "awaiting_human_review" && selectedCaseRun);
}

function canRejectCase(caseRow) {
  return Boolean(caseRow && caseRow.status === "awaiting_human_review");
}

function canReopenCase(caseRow) {
  return Boolean(caseRow && ["approved", "rejected", "awaiting_human_review"].includes(caseRow.status));
}

function renderReviewSummary(caseRow) {
  if (!caseRow) {
    reviewSummary.className = "run-summary empty-list";
    reviewSummary.textContent = "Nenhuma revisão registrada para este caso.";
    approveCaseButton.disabled = true;
    rejectCaseButton.disabled = true;
    reopenCaseButton.disabled = true;
    return;
  }

  const reviewStateLabel = formatEnumLabel(caseRow.status);
  const reviewedBy = caseRow.approved_by_email || caseRow.rejected_by_email || "-";
  const reviewedAt = caseRow.approved_at || caseRow.rejected_at || null;
  const runStatus = selectedCaseRun?.status ? formatEnumLabel(selectedCaseRun.status) : "Sem execução";

  reviewSummary.className = "run-summary";
  reviewSummary.innerHTML = `
    <div class="detail-grid">
      <div>
        <small>Status do caso</small>
        <p>${escapeHtml(reviewStateLabel)}</p>
      </div>
      <div>
        <small>Status da execução</small>
        <p>${escapeHtml(runStatus)}</p>
      </div>
      <div>
        <small>Revisado por</small>
        <p>${escapeHtml(reviewedBy)}</p>
      </div>
      <div>
        <small>Data da decisão</small>
        <p>${escapeHtml(formatDate(reviewedAt))}</p>
      </div>
    </div>
  `;

  approveCaseButton.disabled = isReviewingCase || !canApproveCase(caseRow);
  rejectCaseButton.disabled = isReviewingCase || !canRejectCase(caseRow);
  reopenCaseButton.disabled = isReviewingCase || !canReopenCase(caseRow);
}

function renderRunSummary() {
  if (!selectedCaseRun) {
    runSubtitle.textContent = "Nenhuma execução preparada ainda.";
    runSummary.className = "run-summary empty-list";
    runSummary.textContent = "Nenhuma execução encontrada para este caso.";
    stepsList.innerHTML = "";
    runFinalOutput.value = "";
    fields.stepCode.value = "agent_01";
    fields.stepOutputJson.value = "";
    fields.stepErrorMessage.value = "";
    return;
  }

  runSubtitle.textContent = `Run #${selectedCaseRun.run_number} · ${formatEnumLabel(selectedCaseRun.status)}`;
  runSummary.className = "run-summary";
  runSummary.innerHTML = `
    <div class="detail-grid">
      <div>
        <small>Status</small>
        <p>${escapeHtml(formatEnumLabel(selectedCaseRun.status))}</p>
      </div>
      <div>
        <small>Modelo</small>
        <p>${escapeHtml(selectedCaseRun.model_provider || "-")} · ${escapeHtml(selectedCaseRun.model_name || "-")}</p>
      </div>
      <div>
        <small>Início</small>
        <p>${escapeHtml(formatDate(selectedCaseRun.started_at))}</p>
      </div>
      <div>
        <small>Fim</small>
        <p>${escapeHtml(formatDate(selectedCaseRun.finished_at))}</p>
      </div>
    </div>
  `;
  runFinalOutput.value = stringifyJson(selectedCaseRun.final_output);

  if (!selectedCaseSteps.length) {
    stepsList.innerHTML = '<div class="empty-list">A execução existe, mas ainda não há etapas registradas.</div>';
    return;
  }

  stepsList.innerHTML = selectedCaseSteps.map((step) => `
    <article class="step-card">
      <div class="step-card-head">
        <div>
          <h4>${escapeHtml(step.agent_name)}</h4>
          <div class="step-meta">
            <span class="step-status">${escapeHtml(step.step_code)}</span>
            <span class="${escapeHtml(getStatusChipClass(step.status))}">${escapeHtml(formatEnumLabel(step.status))}</span>
          </div>
        </div>
        <span class="tag">Ordem ${escapeHtml(String(step.step_order))}</span>
      </div>
      <p>${escapeHtml(step.prompt_snapshot || "Sem snapshot registrado.")}</p>
      <div class="step-meta">
        <span><strong>Início:</strong> ${escapeHtml(formatDate(step.started_at))}</span>
        <span><strong>Fim:</strong> ${escapeHtml(formatDate(step.finished_at))}</span>
      </div>
    </article>
  `).join("");

  const runningStep = selectedCaseSteps.find((step) => step.status === "running")
    || selectedCaseSteps.find((step) => step.status === "pending")
    || selectedCaseSteps[selectedCaseSteps.length - 1];

  if (runningStep) {
    fields.stepCode.value = runningStep.step_code;
    fields.stepOutputJson.value = stringifyJson(runningStep.output_payload);
    fields.stepErrorMessage.value = runningStep.error_message || "";
  }
}

function showCaseDetail(caseRow) {
  emptyState.classList.add("hidden");
  detailView.classList.remove("hidden");
  populateCaseDetail(caseRow);
  renderCanonicalDiagnostic();
  renderOfficialDiagnosticResult();
  renderOfficialExecutionPlan();
  renderRunSummary();
  renderReviewSummary(caseRow);
}

async function selectCase(caseId) {
  selectedCaseId = caseId;
  setFeedback(caseFeedback, "");
  setFeedback(stepFeedback, "");
  setFeedback(canonicalFeedback, "");
  setFeedback(reviewFeedback, "");
  renderCases();

  const caseRow = diagnosisCases.find((item) => item.id === caseId);
  if (!caseRow) return;

  try {
    selectedCaseInput = await fetchCaseInput(caseId);
    selectedCaseRun = await fetchCaseRun(caseRow);
    selectedCaseSteps = await fetchRunSteps(selectedCaseRun?.id || "");
    selectedCanonicalArtifact = await fetchLatestArtifact(caseId, "canonical_diagnosis_json");
    selectedOfficialDiagnosticArtifact = await fetchLatestArtifact(caseId, "official_diagnostic_result_json");
    selectedOfficialExecutionArtifact = await fetchLatestArtifact(caseId, "official_execution_plan_json");
    showCaseDetail(caseRow);
  } catch (error) {
    console.error("selectCase error", error);
    setFeedback(caseFeedback, "Nao foi possivel carregar os detalhes do caso.", "error");
  }
}

async function fetchCases() {
  const { data, error } = await supabase
    .from("crm_diagnosis_cases")
    .select(`
      *,
      lead:crm_leads_public (
        id,
        name,
        company,
        phone,
        city,
        state,
        need,
        urgency,
        notes
      )
    `)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  diagnosisCases = data || [];
}

async function refreshCases(options = {}) {
  const keepSelected = options.keepSelected !== false;
  await fetchCases();
  renderStats();
  renderCases();

  if (bootCaseId) {
    const targetCase = diagnosisCases.find((item) => item.id === bootCaseId);
    if (targetCase) {
      const caseId = bootCaseId;
      bootCaseId = "";
      await selectCase(caseId);
      return;
    }
  }

  if (keepSelected && selectedCaseId) {
    const stillExists = diagnosisCases.find((item) => item.id === selectedCaseId);
    if (stillExists) {
      await selectCase(selectedCaseId);
      return;
    }
  }

  selectedCaseId = null;
  selectedCaseInput = null;
  selectedCaseRun = null;
  selectedCaseSteps = [];
  selectedCanonicalArtifact = null;
  selectedOfficialDiagnosticArtifact = null;
  selectedOfficialExecutionArtifact = null;
  detailView.classList.add("hidden");
  emptyState.classList.remove("hidden");
  detailSubtitle.textContent = "Selecione um caso para revisar briefing, execução e saída das etapas.";
}

function setCaseSavingState(isSaving) {
  isSavingCase = isSaving;
  saveCaseButton.disabled = isSaving;
  saveCaseButton.textContent = isSaving ? "Salvando..." : "Salvar briefing";
}

function setCreateCaseState(isSaving) {
  isCreatingCase = isSaving;
  newCaseButton.disabled = isSaving;
  newCaseButton.textContent = isSaving ? "Abrindo..." : "Abrir diagnóstico";
}

function setPrepareRunState(isSaving) {
  isPreparingRun = isSaving;
  prepareRunButton.disabled = isSaving;
  prepareRunButton.textContent = isSaving ? "Preparando..." : "Preparar execução";
}

function setCanonicalGenerationState(isSaving) {
  isGeneratingCanonical = isSaving;
  generateCanonicalButton.disabled = isSaving;
  generateCanonicalButton.textContent = isSaving ? "Gerando..." : "Gerar diagnóstico canônico";
}

function setStepSavingState(isSaving) {
  isSavingStep = isSaving;
  saveStepButton.disabled = isSaving;
  saveStepButton.textContent = isSaving ? "Registrando..." : "Registrar etapa";
}

function setReviewState(isSaving, action = "") {
  isReviewingCase = isSaving;
  approveCaseButton.disabled = isSaving;
  rejectCaseButton.disabled = isSaving;
  reopenCaseButton.disabled = isSaving;

  approveCaseButton.textContent = isSaving && action === "approve"
    ? "Aprovando..."
    : "Aprovar diagnóstico";
  rejectCaseButton.textContent = isSaving && action === "reject"
    ? "Rejeitando..."
    : "Rejeitar para ajustes";
  reopenCaseButton.textContent = isSaving && action === "reopen"
    ? "Reabrindo..."
    : "Reabrir caso";
}

async function persistCurrentCaseEdits() {
  const body = {
    case_id: selectedCaseId,
    priority: fields.priority.value,
    assigned_to: fields.assigned.value.trim() || null,
    briefing_summary: fields.briefing.value.trim() || null,
    theme: fields.theme.value.trim() || null,
    territorial_scope: fields.territorialScope.value.trim() || null,
    declared_need: fields.declaredNeed.value.trim() || null,
    customer_context: fields.customerContext.value.trim() || null,
    known_constraints: fields.knownConstraints.value.trim() || null,
    qualification_questionnaire: buildQualificationQuestionnairePayload(),
  };

  const { data, error } = await supabase.functions.invoke("save-diagnosis-briefing", { body });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Falha ao salvar o briefing do diagnostico.");

  if (data.case?.id) {
    diagnosisCases = diagnosisCases.map((item) => item.id === data.case.id
      ? { ...item, ...data.case }
      : item);
  }

  selectedCaseInput = data.input || selectedCaseInput;
}

async function handleLogin(event) {
  event.preventDefault();

  if (!supabase) {
    setFeedback(loginFeedback, "Configuração do Supabase ausente.", "error");
    return;
  }

  const formData = new FormData(loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  setFeedback(loginFeedback, "Entrando...");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setFeedback(loginFeedback, error.message || "Falha de autenticação.", "error");
    return;
  }

  session = data.session;
  await initializeAuthenticatedState();
}

async function handleSignOut() {
  await supabase.auth.signOut();
  session = null;
  analystUser = null;
  diagnosisCases = [];
  selectedCaseId = null;
  selectedCanonicalArtifact = null;
  detailView.classList.add("hidden");
  emptyState.classList.remove("hidden");
  loginPanel.classList.remove("hidden");
  appPanel.classList.add("hidden");
  signoutButton.classList.add("hidden");
  sessionBadge.classList.add("hidden");
}

async function initializeAuthenticatedState() {
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user?.email) {
    setFeedback(loginFeedback, "Sessão não encontrada.", "error");
    return;
  }

  analystUser = userData.user;
  sessionBadge.textContent = analystUser.email;
  sessionBadge.classList.remove("hidden");
  signoutButton.classList.remove("hidden");
  loginPanel.classList.add("hidden");
  appPanel.classList.remove("hidden");
  setFeedback(loginFeedback, "");

  try {
    await refreshCases({ keepSelected: false });
  } catch (refreshError) {
    console.error("initializeAuthenticatedState refresh error", refreshError);
    setFeedback(loginFeedback, "Sessão aberta, mas a carga dos casos falhou.", "error");
  }
}

async function handleCreateCase(event) {
  event.preventDefault();
  setCreateCaseState(true);
  setFeedback(newCaseFeedback, "Abrindo caso...");

  try {
    const body = {
      lead_id: document.getElementById("new-case-lead-id").value.trim(),
      diagnosis_type: document.getElementById("new-case-diagnosis-type").value,
      briefing_summary: document.getElementById("new-case-briefing").value.trim(),
      territorial_scope: document.getElementById("new-case-scope").value.trim(),
    };

    const { data, error } = await supabase.functions.invoke("open-diagnosis-case", { body });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Falha ao abrir caso.");

    newCaseForm.reset();
    setFeedback(newCaseFeedback, "Caso de diagnóstico aberto com sucesso.", "success");
    await refreshCases({ keepSelected: false });

    if (data.case?.id) {
      await selectCase(data.case.id);
    }
  } catch (error) {
    console.error("handleCreateCase error", error);
    setFeedback(newCaseFeedback, error.message || "Não foi possível abrir o caso.", "error");
  } finally {
    setCreateCaseState(false);
  }
}

async function handleSaveCase(event) {
  event.preventDefault();

  if (!selectedCaseId) return;

  setCaseSavingState(true);
  setFeedback(caseFeedback, "Salvando briefing...");

  try {
    await persistCurrentCaseEdits();
    setFeedback(caseFeedback, "Briefing salvo com sucesso.", "success");
    await refreshCases();
  } catch (error) {
    console.error("handleSaveCase error", error);
    setFeedback(caseFeedback, error.message || "Não foi possível salvar o briefing.", "error");
  } finally {
    setCaseSavingState(false);
  }
}

async function handleGenerateCanonicalDiagnosis() {
  if (!selectedCaseId) return;

  setCanonicalGenerationState(true);
  setFeedback(canonicalFeedback, "Salvando briefing e gerando payload canônico...");

  try {
    await persistCurrentCaseEdits();

    const { data, error } = await supabase.functions.invoke("generate-canonical-diagnosis", {
      body: {
        case_id: selectedCaseId,
        source: "analyst_area",
        mark_ready: true,
        attach_to_current_run: Boolean(selectedCaseRun?.id),
      },
    });

    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Falha ao gerar o diagnóstico canônico.");

    setFeedback(canonicalFeedback, "Diagnóstico canônico gerado com sucesso.", "success");
    await refreshCases();
  } catch (error) {
    console.error("handleGenerateCanonicalDiagnosis error", error);
    setFeedback(
      canonicalFeedback,
      error.message || "Não foi possível gerar o diagnóstico canônico.",
      "error",
    );
  } finally {
    setCanonicalGenerationState(false);
  }
}

async function handlePrepareRun() {
  if (!selectedCaseId) return;

  setPrepareRunState(true);
  setFeedback(caseFeedback, "Preparando execução...");

  try {
    const { data, error } = await supabase.functions.invoke("prepare-diagnosis-run", {
      body: {
        case_id: selectedCaseId,
        model_provider: "manual",
        model_name: "habilis-pipeline-v1",
        execution_mode: "manual",
      },
    });

    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Falha ao preparar execução.");

    setFeedback(caseFeedback, "Execução preparada com sucesso.", "success");
    await refreshCases();
  } catch (error) {
    console.error("handlePrepareRun error", error);
    setFeedback(caseFeedback, error.message || "Não foi possível preparar a execução.", "error");
  } finally {
    setPrepareRunState(false);
  }
}

async function updateCaseReviewDecision(pendingMessage, successMessage, action) {
  if (!selectedCaseId) return;

  setReviewState(true, action);
  setFeedback(reviewFeedback, pendingMessage);

  try {
    await persistCurrentCaseEdits();

    const { data, error } = await supabase.functions.invoke("review-diagnosis-case", {
      body: {
        case_id: selectedCaseId,
        action,
      },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Falha ao concluir a revisao do caso.");

    setFeedback(reviewFeedback, successMessage, "success");
    await refreshCases();
  } catch (error) {
    console.error("updateCaseReviewDecision error", error);
    setFeedback(reviewFeedback, error.message || "Não foi possível concluir a revisão humana.", "error");
  } finally {
    setReviewState(false);
  }
}

async function handleApproveCase() {
  const caseRow = getSelectedCaseRow();
  if (!canApproveCase(caseRow)) {
    setFeedback(reviewFeedback, "O caso precisa estar aguardando revisão para ser aprovado.", "error");
    return;
  }

  await updateCaseReviewDecision("Aprovando diagnóstico...", "Diagnóstico aprovado com sucesso.", "approve");
}

async function handleRejectCase() {
  const caseRow = getSelectedCaseRow();
  if (!canRejectCase(caseRow)) {
    setFeedback(reviewFeedback, "O caso precisa estar aguardando revisão para ser rejeitado.", "error");
    return;
  }

  await updateCaseReviewDecision("Devolvendo diagnóstico para ajustes...", "Diagnóstico devolvido para ajustes com sucesso.", "reject");
}

async function handleReopenCase() {
  const caseRow = getSelectedCaseRow();
  if (!canReopenCase(caseRow)) {
    setFeedback(reviewFeedback, "Somente casos aprovados, rejeitados ou em revisão podem ser reabertos.", "error");
    return;
  }

  await updateCaseReviewDecision("Reabrindo caso para ajustes...", "Caso reaberto para ajustes com sucesso.", "reopen");
}

async function handleSaveStep(event) {
  event.preventDefault();

  if (!selectedCaseRun?.id) {
    setFeedback(stepFeedback, "Prepare uma execução antes de registrar etapas.", "error");
    return;
  }

  setStepSavingState(true);
  setFeedback(stepFeedback, "Registrando etapa...");

  try {
    const body = {
      run_id: selectedCaseRun.id,
      step_code: fields.stepCode.value,
      status: fields.stepStatus.value,
      output_payload: parseJsonSafely(fields.stepOutputJson.value),
      error_message: fields.stepErrorMessage.value.trim(),
    };

    const { data, error } = await supabase.functions.invoke("ingest-diagnosis-step-output", { body });
    if (error) throw error;
    if (!data?.ok) throw new Error(data?.error || "Falha ao registrar etapa.");

    setFeedback(stepFeedback, "Etapa registrada com sucesso.", "success");
    await refreshCases();
  } catch (error) {
    console.error("handleSaveStep error", error);
    setFeedback(stepFeedback, error.message || "Não foi possível registrar a etapa.", "error");
  } finally {
    setStepSavingState(false);
  }
}

function bindFiltering() {
  [searchInput, statusFilter, typeFilter].forEach((node) => {
    node.addEventListener("input", renderCases);
    node.addEventListener("change", renderCases);
  });

  queueButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.queueFilter || "";
      activeQueueFilter = activeQueueFilter === next ? "" : next;
      queueButtons.forEach((item) => item.classList.toggle("active", item === button && activeQueueFilter));
      renderCases();
    });
  });
}

async function boot() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    setFeedback(loginFeedback, "Configure o analista/config.js antes de usar a área do Analista.", "error");
    return;
  }

  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

  loginForm.addEventListener("submit", handleLogin);
  signoutButton.addEventListener("click", handleSignOut);
  refreshButton.addEventListener("click", async () => {
    try {
      await refreshCases();
    } catch (error) {
      console.error("manual refresh error", error);
      setFeedback(caseFeedback, "Não foi possível atualizar a fila.", "error");
    }
  });
  newCaseForm.addEventListener("submit", handleCreateCase);
  caseForm.addEventListener("submit", handleSaveCase);
  generateCanonicalButton.addEventListener("click", handleGenerateCanonicalDiagnosis);
  prepareRunButton.addEventListener("click", handlePrepareRun);
  approveCaseButton.addEventListener("click", handleApproveCase);
  rejectCaseButton.addEventListener("click", handleRejectCase);
  reopenCaseButton.addEventListener("click", handleReopenCase);
  stepOutputForm.addEventListener("submit", handleSaveStep);
  bindFiltering();

  const { data } = await supabase.auth.getSession();
  session = data.session;
  if (session) {
    await initializeAuthenticatedState();
  }
}

boot().catch((error) => {
  console.error("boot error", error);
  setFeedback(loginFeedback, "Falha ao inicializar a área do Analista.", "error");
});
