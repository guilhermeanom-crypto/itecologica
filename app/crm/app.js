import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const config = window.ITECOLOGICA_CRM_CONFIG || {};

const loginPanel = document.getElementById("login-panel");
const appPanel = document.getElementById("app-panel");
const loginForm = document.getElementById("login-form");
const loginFeedback = document.getElementById("login-feedback");
const signoutButton = document.getElementById("signout-button");
const sessionBadge = document.getElementById("session-badge");
const refreshButton = document.getElementById("refresh-button");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const priorityFilter = document.getElementById("priority-filter");
const ownerFilter = document.getElementById("owner-filter");
const leadsList = document.getElementById("leads-list");
const queueButtons = Array.from(document.querySelectorAll("[data-queue-filter]"));
const emptyState = document.getElementById("empty-state");
const leadForm = document.getElementById("lead-form");
const detailSubtitle = document.getElementById("detail-subtitle");
const detailFeedback = document.getElementById("detail-feedback");
const saveButton = document.getElementById("save-button");
const interactionHistory = document.getElementById("interaction-history");
const interactionFeedback = document.getElementById("interaction-feedback");
const interactionSaveButton = document.getElementById("interaction-save-button");

const statTotal = document.getElementById("stat-total");
const statNew = document.getElementById("stat-new");
const statContact = document.getElementById("stat-contact");
const statWon = document.getElementById("stat-won");
const statOverdue = document.getElementById("stat-overdue");
const statNoInteraction = document.getElementById("stat-no-interaction");
const statUnassigned = document.getElementById("stat-unassigned");
const statNoNextAction = document.getElementById("stat-no-next-action");
const queueOverdueCount = document.getElementById("queue-overdue-count");
const queueTodayCount = document.getElementById("queue-today-count");
const queueUnassignedCount = document.getElementById("queue-unassigned-count");
const queueNewNoContactCount = document.getElementById("queue-new-no-contact-count");

const fields = {
  name: document.getElementById("lead-name"),
  company: document.getElementById("lead-company"),
  contact: document.getElementById("lead-contact"),
  origin: document.getElementById("lead-origin"),
  status: document.getElementById("lead-status"),
  qualification: document.getElementById("lead-qualification"),
  assigned: document.getElementById("lead-assigned"),
  firstContact: document.getElementById("lead-first-contact"),
  nextAction: document.getElementById("lead-next-action"),
  nextFollowUp: document.getElementById("lead-next-follow-up"),
  internalNotes: document.getElementById("lead-internal-notes"),
  lastInteractionAt: document.getElementById("lead-last-interaction-at"),
  lastInteractionSummary: document.getElementById("lead-last-interaction-summary"),
  firstContactStatus: document.getElementById("lead-first-contact-status"),
  firstContactChannel: document.getElementById("lead-first-contact-channel"),
  firstContactAttempted: document.getElementById("lead-first-contact-attempted"),
  firstContactError: document.getElementById("lead-first-contact-error"),
  need: document.getElementById("lead-need"),
  urgency: document.getElementById("lead-urgency"),
  publicNotes: document.getElementById("lead-public-notes"),
  interactionType: document.getElementById("interaction-type"),
  interactionOutcome: document.getElementById("interaction-outcome"),
  interactionChannel: document.getElementById("interaction-channel"),
  interactionNextFollowUp: document.getElementById("interaction-next-follow-up"),
  interactionSummary: document.getElementById("interaction-summary"),
  interactionNextAction: document.getElementById("interaction-next-action"),
};

let supabase = null;
let session = null;
let crmUser = null;
let leads = [];
let selectedLeadId = null;
let selectedLeadInteractions = [];
let isSavingLead = false;
let isSavingInteraction = false;

function setFeedback(node, message, type = "") {
  node.textContent = message;
  node.className = `feedback ${type}`.trim();
}

function setLeadFormSavingState(isSaving) {
  isSavingLead = isSaving;

  if (saveButton) {
    saveButton.disabled = isSaving;
    saveButton.textContent = isSaving ? "Salvando..." : "Salvar atendimento";
  }

  [
    fields.status,
    fields.qualification,
    fields.assigned,
    fields.firstContact,
    fields.nextAction,
    fields.nextFollowUp,
    fields.internalNotes,
  ].forEach((field) => {
    if (field) field.disabled = isSaving;
  });
}

function setInteractionSavingState(isSaving) {
  isSavingInteraction = isSaving;

  if (interactionSaveButton) {
    interactionSaveButton.disabled = isSaving;
    interactionSaveButton.textContent = isSaving ? "Registrando..." : "Registrar interacao";
  }

  [
    fields.interactionType,
    fields.interactionOutcome,
    fields.interactionChannel,
    fields.interactionNextFollowUp,
    fields.interactionSummary,
    fields.interactionNextAction,
  ].forEach((field) => {
    if (field) field.disabled = isSaving;
  });
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

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDateTimeLocal(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatEnumLabel(value) {
  return String(value || "-")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function isLeadOverdue(lead) {
  if (!lead?.next_follow_up_at) return false;
  const followUp = new Date(lead.next_follow_up_at);
  if (Number.isNaN(followUp.getTime())) return false;
  return followUp.getTime() < Date.now();
}

function hasNoInteraction(lead) {
  return !lead?.last_interaction_at;
}

function isUnassigned(lead) {
  return !String(lead?.assigned_to || "").trim();
}

function hasNoNextAction(lead) {
  return !String(lead?.next_action || "").trim();
}

function isLeadForToday(lead) {
  if (!lead?.next_follow_up_at) return false;
  const followUp = new Date(lead.next_follow_up_at);
  if (Number.isNaN(followUp.getTime())) return false;

  const now = new Date();
  return followUp.getFullYear() === now.getFullYear()
    && followUp.getMonth() === now.getMonth()
    && followUp.getDate() === now.getDate();
}

function isNewWithoutContact(lead) {
  return lead?.status === "novo" && hasNoInteraction(lead);
}

function isMine(lead) {
  const assigned = String(lead?.assigned_to || "").trim().toLowerCase();
  const email = String(crmUser?.email || "").trim().toLowerCase();
  return Boolean(assigned && email && assigned === email);
}

function getLeadPriorityScore(lead) {
  let score = 0;

  if (isLeadOverdue(lead)) score += 500;
  if (isLeadForToday(lead)) score += 350;
  if (isNewWithoutContact(lead)) score += 300;
  if (isUnassigned(lead)) score += 160;
  if (hasNoNextAction(lead)) score += 80;

  if (lead?.urgency === "critica") score += 60;
  if (lead?.urgency === "alta") score += 40;
  if (lead?.status === "novo") score += 30;

  return score;
}

function compareLeadPriority(a, b) {
  const scoreDiff = getLeadPriorityScore(b) - getLeadPriorityScore(a);
  if (scoreDiff !== 0) return scoreDiff;

  const aFollowUp = a?.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : Number.POSITIVE_INFINITY;
  const bFollowUp = b?.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : Number.POSITIVE_INFINITY;
  if (aFollowUp !== bFollowUp) return aFollowUp - bFollowUp;

  const aCreated = a?.created_at ? new Date(a.created_at).getTime() : 0;
  const bCreated = b?.created_at ? new Date(b.created_at).getTime() : 0;
  return bCreated - aCreated;
}

function populateOwnerFilterOptions() {
  const previousValue = ownerFilter.value;
  const owners = Array.from(new Set(
    leads
      .map((lead) => String(lead.assigned_to || "").trim())
      .filter(Boolean),
  )).sort((a, b) => a.localeCompare(b, "pt-BR"));

  ownerFilter.innerHTML = [
    '<option value="">Todos os responsaveis</option>',
    '<option value="mine">Meus leads</option>',
    '<option value="unassigned">Sem responsavel</option>',
    ...owners.map((owner) => `<option value="${escapeHtml(owner)}">${escapeHtml(owner)}</option>`),
  ].join("");

  const allowedValues = new Set(["", "mine", "unassigned", ...owners]);
  ownerFilter.value = allowedValues.has(previousValue) ? previousValue : "";
}

function formatFirstContactStatus(value) {
  switch (value) {
    case "sent":
      return "Enviado no WhatsApp";
    case "failed":
      return "Falhou";
    case "invalid_phone":
      return "Telefone invalido";
    case "replied":
      return "Lead respondeu";
    case "pending":
      return "Pendente";
    default:
      return value || "-";
  }
}

function resetInteractionComposer() {
  fields.interactionType.value = "whatsapp";
  fields.interactionOutcome.value = "";
  fields.interactionChannel.value = "";
  fields.interactionNextFollowUp.value = "";
  fields.interactionSummary.value = "";
  fields.interactionNextAction.value = "";
  setFeedback(interactionFeedback, "");
}

function renderInteractionHistory() {
  if (!interactionHistory) return;

  if (!selectedLeadInteractions.length) {
    interactionHistory.innerHTML = '<div class="empty-list">Nenhuma interacao registrada ainda.</div>';
    return;
  }

  interactionHistory.innerHTML = selectedLeadInteractions.map((interaction) => `
    <article class="interaction-card">
      <div class="interaction-card-head">
        <div>
          <strong>${escapeHtml(formatEnumLabel(interaction.interaction_type))}</strong>
          <p>${escapeHtml(formatDate(interaction.created_at))}</p>
        </div>
        <div class="interaction-tags">
          <span class="tag">${escapeHtml(formatEnumLabel(interaction.outcome || "sem_resultado"))}</span>
          <span class="tag">${escapeHtml(interaction.interaction_channel || "-")}</span>
        </div>
      </div>
      <p class="interaction-summary">${escapeHtml(interaction.summary)}</p>
      <div class="interaction-meta">
        <span><strong>Proxima acao:</strong> ${escapeHtml(interaction.next_action || "-")}</span>
        <span><strong>Follow-up:</strong> ${escapeHtml(formatDate(interaction.next_follow_up_at))}</span>
        <span><strong>Registrado por:</strong> ${escapeHtml(interaction.created_by_name || interaction.created_by_email || "-")}</span>
      </div>
    </article>
  `).join("");
}

async function setSelectedLead(leadId) {
  selectedLeadId = leadId;
  selectedLeadInteractions = [];
  resetInteractionComposer();
  renderLeads();
  renderSelectedLead();
  await fetchLeadInteractions(leadId);
}

function renderStats() {
  statTotal.textContent = String(leads.length);
  statNew.textContent = String(leads.filter((lead) => lead.status === "novo").length);
  statContact.textContent = String(leads.filter((lead) => lead.status === "em_contato").length);
  statWon.textContent = String(leads.filter((lead) => lead.status === "fechado").length);
  statOverdue.textContent = String(leads.filter(isLeadOverdue).length);
  statNoInteraction.textContent = String(leads.filter(hasNoInteraction).length);
  statUnassigned.textContent = String(leads.filter(isUnassigned).length);
  statNoNextAction.textContent = String(leads.filter(hasNoNextAction).length);
  queueOverdueCount.textContent = String(leads.filter(isLeadOverdue).length);
  queueTodayCount.textContent = String(leads.filter(isLeadForToday).length);
  queueUnassignedCount.textContent = String(leads.filter(isUnassigned).length);
  queueNewNoContactCount.textContent = String(leads.filter(isNewWithoutContact).length);
}

function getFilteredLeads() {
  const term = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value;
  const priority = priorityFilter.value;
  const owner = ownerFilter.value;

  return leads.filter((lead) => {
    const matchesStatus = !status || lead.status === status;
    const haystack = [
      lead.name,
      lead.company,
      lead.phone,
      lead.email,
      lead.city,
      lead.state,
    ].join(" ").toLowerCase();
    const matchesSearch = !term || haystack.includes(term);

    let matchesPriority = true;
    if (priority === "overdue_follow_up") matchesPriority = isLeadOverdue(lead);
    if (priority === "today_follow_up") matchesPriority = isLeadForToday(lead);
    if (priority === "no_interaction") matchesPriority = hasNoInteraction(lead);
    if (priority === "unassigned") matchesPriority = isUnassigned(lead);
    if (priority === "no_next_action") matchesPriority = hasNoNextAction(lead);
    if (priority === "new_no_contact") matchesPriority = isNewWithoutContact(lead);

    let matchesOwner = true;
    if (owner === "mine") matchesOwner = isMine(lead);
    if (owner === "unassigned") matchesOwner = isUnassigned(lead);
    if (owner && owner !== "mine" && owner !== "unassigned") {
      matchesOwner = String(lead.assigned_to || "").trim() === owner;
    }

    return matchesStatus && matchesSearch && matchesPriority && matchesOwner;
  }).sort(compareLeadPriority);
}

function applyQueueFilter(filterValue) {
  priorityFilter.value = filterValue || "";
  ownerFilter.value = "";
  renderLeads();
  leadsList.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderLeads() {
  const filtered = getFilteredLeads();

  if (filtered.length === 0) {
    leadsList.innerHTML = '<div class="empty-list">Nenhum lead encontrado com os filtros atuais.</div>';
    return;
  }

  leadsList.innerHTML = filtered.map((lead) => `
    <article class="lead-row ${lead.id === selectedLeadId ? "active" : ""}">
      <button type="button" data-lead-id="${lead.id}">
        <div class="lead-head">
          <div>
            <h3 class="lead-title">${escapeHtml(lead.name)}</h3>
            <p class="lead-company">${escapeHtml(lead.company)}</p>
          </div>
          <div class="lead-tags">
            <span class="tag status-${escapeHtml(lead.status)}">${escapeHtml(lead.status || "novo")}</span>
            <span class="tag urgencia-${escapeHtml(lead.urgency)}">${escapeHtml(lead.urgency || "media")}</span>
            ${isLeadOverdue(lead) ? '<span class="tag priority-overdue">Follow-up vencido</span>' : ""}
            ${hasNoInteraction(lead) ? '<span class="tag priority-idle">Sem interacao</span>' : ""}
          </div>
        </div>
        <div class="lead-meta">
          <span>${escapeHtml(lead.phone || "-")}</span>
          <span>${escapeHtml([lead.city, lead.state].filter(Boolean).join(" / ") || "-")}</span>
          <span>${escapeHtml(lead.need || "-")}</span>
          <span>${escapeHtml(lead.assigned_to || "Sem responsavel")}</span>
          <span>${formatDate(lead.created_at)}</span>
          <span>${escapeHtml(lead.email || "-")}</span>
          <span>${escapeHtml(lead.next_action || "Sem proxima acao")}</span>
          <span>${escapeHtml(formatDate(lead.next_follow_up_at))}</span>
        </div>
      </button>
    </article>
  `).join("");

  leadsList.querySelectorAll("[data-lead-id]").forEach((button) => {
    button.addEventListener("click", () => setSelectedLead(button.dataset.leadId));
  });
}

function renderSelectedLead() {
  const lead = leads.find((item) => item.id === selectedLeadId) || null;

  if (!lead) {
    emptyState.classList.remove("hidden");
    leadForm.classList.add("hidden");
    detailSubtitle.textContent = "Selecione um lead na lista para abrir o atendimento.";
    selectedLeadInteractions = [];
    renderInteractionHistory();
    return;
  }

  emptyState.classList.add("hidden");
  leadForm.classList.remove("hidden");
  detailSubtitle.textContent = `Lead criado em ${formatDate(lead.created_at)}`;

  fields.name.textContent = lead.name || "-";
  fields.company.textContent = lead.company || "-";
  fields.contact.textContent = [lead.phone, lead.email].filter(Boolean).join(" | ") || "-";
  fields.origin.textContent = lead.source_page || lead.source || "-";
  fields.status.value = lead.status || "novo";
  fields.qualification.value = lead.qualification_status || "pendente";
  fields.assigned.value = lead.assigned_to || crmUser?.email || "";
  fields.firstContact.value = toDateTimeLocal(lead.first_contact_at);
  fields.nextAction.value = lead.next_action || "";
  fields.nextFollowUp.value = toDateTimeLocal(lead.next_follow_up_at);
  fields.internalNotes.value = lead.internal_notes || "";
  fields.lastInteractionAt.textContent = formatDate(lead.last_interaction_at);
  fields.lastInteractionSummary.textContent = lead.last_interaction_summary || "-";
  fields.firstContactStatus.textContent = formatFirstContactStatus(lead.first_contact_status);
  fields.firstContactChannel.textContent = lead.first_contact_channel || "-";
  fields.firstContactAttempted.textContent = formatDate(lead.first_contact_attempted_at);
  fields.firstContactError.textContent = lead.first_contact_error || "-";
  fields.need.textContent = lead.need || "-";
  fields.urgency.textContent = lead.urgency || "-";
  fields.publicNotes.textContent = lead.notes || "-";

  setFeedback(detailFeedback, "");
  renderInteractionHistory();
}

async function fetchCrmUser() {
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) {
    throw new Error("Sessao autenticada sem e-mail valido.");
  }

  const { data, error } = await supabase
    .from("crm_internal_users")
    .select("email, full_name, role, active")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    const errorText = `${error.code || ""} ${error.message || ""} ${error.details || ""}`.toLowerCase();

    if (
      error.code === "42P01"
      || errorText.includes("relation")
      && errorText.includes("does not exist")
    ) {
      throw new Error("A tabela de acesso do CRM ainda nao existe nesse projeto Supabase. Execute backend/supabase/crm_panel_v1.sql no SQL Editor e tente novamente.");
    }

    if (
      error.code === "42501"
      || errorText.includes("permission denied")
      || errorText.includes("row-level security")
    ) {
      throw new Error("A tabela crm_internal_users existe, mas o acesso pelo CRM ainda nao foi liberado. Execute o SQL completo de backend/supabase/crm_panel_v1.sql para criar as policies e permissoes.");
    }

    throw new Error(`Nao foi possivel validar o acesso do e-mail ${email} no CRM. Detalhe: ${error.message || "erro desconhecido"}`);
  }

  if (!data) {
    throw new Error(`O login no Supabase funcionou, mas o e-mail ${email} ainda nao foi liberado no CRM. Execute backend/supabase/crm_internal_user_seed.sql ou insira esse e-mail na tabela crm_internal_users.`);
  }

  if (!data.active) {
    throw new Error("Usuario interno desativado para o CRM.");
  }

  crmUser = data;
  sessionBadge.textContent = `${data.full_name || data.email} | ${data.role}`;
  sessionBadge.classList.remove("hidden");
}

async function fetchLeads() {
  const { data, error } = await supabase
    .from("crm_leads_public")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    throw new Error(error.message || "Nao foi possivel carregar os leads.");
  }

  leads = data || [];
  populateOwnerFilterOptions();
  renderStats();
  renderLeads();

  if (!selectedLeadId && leads.length > 0) {
    selectedLeadId = leads[0].id;
  }

  if (selectedLeadId && !leads.some((lead) => lead.id === selectedLeadId)) {
    selectedLeadId = leads[0]?.id || null;
  }

  renderSelectedLead();

  if (selectedLeadId) {
    await fetchLeadInteractions(selectedLeadId);
  }
}

async function fetchLeadInteractions(leadId) {
  if (!leadId || !supabase) {
    selectedLeadInteractions = [];
    renderInteractionHistory();
    return;
  }

  const { data, error } = await supabase
    .from("crm_lead_interactions")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    const errorText = `${error.code || ""} ${error.message || ""} ${error.details || ""}`.toLowerCase();
    if (
      error.code === "42P01"
      || errorText.includes("crm_lead_interactions")
      && errorText.includes("does not exist")
    ) {
      selectedLeadInteractions = [];
      interactionHistory.innerHTML = '<div class="empty-list">Execute backend/supabase/crm_interactions_v1.sql para habilitar o historico de interacoes.</div>';
      return;
    }

    selectedLeadInteractions = [];
    interactionHistory.innerHTML = `<div class="empty-list">${escapeHtml(error.message || "Falha ao carregar o historico.")}</div>`;
    return;
  }

  if (selectedLeadId !== leadId) return;

  selectedLeadInteractions = data || [];
  renderInteractionHistory();
}

async function loadDashboard() {
  await fetchCrmUser();
  await fetchLeads();
}

function showApp() {
  loginPanel.classList.add("hidden");
  appPanel.classList.remove("hidden");
  signoutButton.classList.remove("hidden");
}

function showLogin() {
  loginPanel.classList.remove("hidden");
  appPanel.classList.add("hidden");
  signoutButton.classList.add("hidden");
  sessionBadge.classList.add("hidden");
  sessionBadge.textContent = "";
  leads = [];
  selectedLeadId = null;
  selectedLeadInteractions = [];
  renderInteractionHistory();
}

async function bootstrap() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    setFeedback(loginFeedback, "Configure crm/config.js com a URL e a chave anon do Supabase.", "error");
    return;
  }

  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  const { data } = await supabase.auth.getSession();
  session = data.session;

  if (!session) {
    showLogin();
    return;
  }

  try {
    await loadDashboard();
    showApp();
  } catch (error) {
    await supabase.auth.signOut();
    showLogin();
    setFeedback(loginFeedback, error.message || "Falha ao abrir o CRM.", "error");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabase) {
    setFeedback(loginFeedback, "CRM sem conexao com Supabase. Revise crm/config.js e recarregue a pagina.", "error");
    return;
  }

  setFeedback(loginFeedback, "Entrando...");

  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    session = data.session;
    await loadDashboard();
    showApp();
    setFeedback(loginFeedback, "");
  } catch (error) {
    setFeedback(loginFeedback, error.message || "Falha ao entrar.", "error");
  }
});

signoutButton.addEventListener("click", async () => {
  if (supabase) {
    await supabase.auth.signOut();
  }
  crmUser = null;
  showLogin();
});

refreshButton.addEventListener("click", async () => {
  try {
    await fetchLeads();
  } catch (error) {
    setFeedback(detailFeedback, error.message || "Falha ao atualizar os leads.", "error");
  }
});

searchInput.addEventListener("input", renderLeads);
statusFilter.addEventListener("change", renderLeads);
priorityFilter.addEventListener("change", renderLeads);
ownerFilter.addEventListener("change", renderLeads);
queueButtons.forEach((button) => {
  button.addEventListener("click", () => applyQueueFilter(button.dataset.queueFilter || ""));
});

leadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSavingLead) return;

  const lead = leads.find((item) => item.id === selectedLeadId);
  if (!lead) return;

  setLeadFormSavingState(true);
  setFeedback(detailFeedback, "Salvando...");

  const payload = {
    status: fields.status.value,
    qualification_status: fields.qualification.value,
    assigned_to: fields.assigned.value.trim() || null,
    first_contact_at: fromDateTimeLocal(fields.firstContact.value),
    next_action: fields.nextAction.value.trim() || null,
    next_follow_up_at: fromDateTimeLocal(fields.nextFollowUp.value),
    internal_notes: fields.internalNotes.value.trim() || null,
  };

  try {
    const { data, error } = await supabase
      .from("crm_leads_public")
      .update(payload)
      .eq("id", lead.id)
      .select("*")
      .single();

    if (error) throw error;

    leads = leads.map((item) => item.id === lead.id ? data : item);
    renderStats();
    renderLeads();
    renderSelectedLead();
    setFeedback(detailFeedback, "Lead atualizado com sucesso.", "success");
  } catch (error) {
    setFeedback(detailFeedback, error.message || "Falha ao salvar o lead.", "error");
  } finally {
    setLeadFormSavingState(false);
  }
});

interactionSaveButton.addEventListener("click", async () => {
  if (isSavingInteraction) return;

  const lead = leads.find((item) => item.id === selectedLeadId);
  if (!lead) return;

  const summary = fields.interactionSummary.value.trim();
  if (!summary) {
    setFeedback(interactionFeedback, "Escreva um resumo da interacao antes de registrar.", "error");
    return;
  }

  const interactionType = fields.interactionType.value;
  const interactionOutcome = fields.interactionOutcome.value || null;
  const interactionChannel = fields.interactionChannel.value.trim() || formatEnumLabel(interactionType);
  const interactionNextAction = fields.interactionNextAction.value.trim() || fields.nextAction.value.trim() || null;
  const interactionNextFollowUp = fromDateTimeLocal(fields.interactionNextFollowUp.value) || fromDateTimeLocal(fields.nextFollowUp.value);
  const interactionTimestamp = new Date().toISOString();

  setInteractionSavingState(true);
  setFeedback(interactionFeedback, "Registrando...");

  try {
    const { data: interaction, error: interactionError } = await supabase
      .from("crm_lead_interactions")
      .insert([{
        lead_id: lead.id,
        interaction_type: interactionType,
        interaction_channel: interactionChannel,
        outcome: interactionOutcome,
        summary,
        next_action: interactionNextAction,
        next_follow_up_at: interactionNextFollowUp,
        created_by_email: crmUser?.email || null,
        created_by_name: crmUser?.full_name || null,
      }])
      .select("*")
      .single();

    if (interactionError) throw interactionError;

    const resolvedFirstContactAt =
      (lead.first_contact_at || interactionType === "nota_interna")
        ? lead.first_contact_at || null
        : interactionTimestamp;

    const leadPatch = {
      next_action: interactionNextAction,
      next_follow_up_at: interactionNextFollowUp,
      last_interaction_at: interactionTimestamp,
      last_interaction_summary: summary,
      first_contact_at: resolvedFirstContactAt,
      status: lead.status === "novo" && interactionType !== "nota_interna"
        ? "em_contato"
        : lead.status,
    };

    const { data: updatedLead, error: leadError } = await supabase
      .from("crm_leads_public")
      .update(leadPatch)
      .eq("id", lead.id)
      .select("*")
      .single();

    if (leadError) {
      selectedLeadInteractions = [interaction, ...selectedLeadInteractions];
      renderInteractionHistory();
      setFeedback(interactionFeedback, "Interacao registrada, mas o resumo do lead nao foi atualizado. Rode backend/supabase/crm_interactions_v1.sql no Supabase e atualize a pagina.", "error");
      return;
    }

    leads = leads.map((item) => item.id === lead.id ? updatedLead : item);
    selectedLeadInteractions = [interaction, ...selectedLeadInteractions];
    renderStats();
    renderLeads();
    renderSelectedLead();
    resetInteractionComposer();
    setFeedback(interactionFeedback, "Interacao registrada com sucesso.", "success");
  } catch (error) {
    setFeedback(interactionFeedback, error.message || "Falha ao registrar interacao.", "error");
  } finally {
    setInteractionSavingState(false);
  }
});

bootstrap();
