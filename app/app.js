const config = window.HABILIS_CAPTACAO_CONFIG || {};

const form = document.getElementById("lead-form");
const feedback = document.getElementById("feedback");
const submitButton = document.getElementById("submit-button");
const formLoadedAtField = form.querySelector('input[name="form_loaded_at"]');
const captchaShell = document.getElementById("captcha-shell");

let captchaToken = "";
let turnstileApi = null;
let turnstileWidgetId = null;

if (formLoadedAtField) {
  formLoadedAtField.value = String(Date.now());
}

function setFeedback(message, type = "") {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`.trim();
}

function getCaptchaFieldValue() {
  const field = form.querySelector('input[name="cf-turnstile-response"]');
  return field?.value?.trim() || "";
}

function getCaptchaToken() {
  return captchaToken || getCaptchaFieldValue();
}

function resetCaptcha() {
  captchaToken = "";
  if (turnstileApi && turnstileWidgetId !== null) {
    turnstileApi.reset(turnstileWidgetId);
  }
}

function loadTurnstile() {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }

    const existing = document.querySelector('script[data-turnstile="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(window.turnstile));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    script.onload = () => resolve(window.turnstile);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function setupCaptcha() {
  if (!config.turnstileSiteKey) {
    return;
  }

  captchaShell.classList.remove("hidden");
  turnstileApi = await loadTurnstile();
  turnstileWidgetId = turnstileApi.render("#captcha-widget", {
    sitekey: config.turnstileSiteKey,
    callback(token) {
      captchaToken = token;
    },
    "expired-callback"() {
      resetCaptcha();
    },
    "error-callback"() {
      resetCaptcha();
    },
  });
}

function buildPayload(formData) {
  const params = new URLSearchParams(window.location.search);

  return {
    name: formData.get("name")?.trim() || "",
    company: formData.get("company")?.trim() || "",
    phone: formData.get("phone")?.trim() || "",
    email: formData.get("email")?.trim() || "",
    cnpj: formData.get("cnpj")?.trim() || "",
    cnae: formData.get("cnae")?.trim() || "",
    city: formData.get("city")?.trim() || "",
    state: formData.get("state")?.trim().toUpperCase() || "",
    need: formData.get("need")?.trim() || "",
    urgency: formData.get("urgency")?.trim() || "",
    notes: formData.get("notes")?.trim() || "",
    website: formData.get("website")?.trim() || "",
    form_loaded_at: Number(formData.get("form_loaded_at") || 0),
    captcha_token: getCaptchaToken(),
    consent: formData.get("consent") === "on",
    source_page: window.location.href,
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
  };
}

async function submitLead(payload) {
  const endpoint = config.apiBaseUrl && config.publicLeadEndpoint
    ? `${config.apiBaseUrl.replace(/\/$/, "")}/${config.publicLeadEndpoint}`
    : "";

  if (!endpoint && config.simulateWhenOffline) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { ok: true, simulated: true };
  }

  if (!endpoint) {
    throw new Error("Endpoint nao configurado.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Falha ao enviar lead.");
    error.code = data.code || "";
    throw error;
  }

  return data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = buildPayload(formData);

  if (!payload.consent) {
    setFeedback("Marque o consentimento para continuar.", "error");
    return;
  }

  if (config.turnstileSiteKey && !payload.captcha_token) {
    setFeedback("Conclua a validacao anti-bot para continuar.", "error");
    return;
  }

  submitButton.disabled = true;
  setFeedback("Enviando lead...");

  try {
    const result = await submitLead(payload);
    form.reset();
    resetCaptcha();
    if (result.simulated) {
      setFeedback("Lead enviado em modo simulacao. Agora configure o endpoint real.", "success");
      return;
    }
    setFeedback("Solicitação enviada com sucesso. Nossa equipe entrará em contato para avaliar sua demanda.", "success");
  } catch (error) {
    if (String(error.code || "").startsWith("turnstile")) {
      resetCaptcha();
    }
    setFeedback(error.message || "Erro inesperado ao enviar lead.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

setupCaptcha().catch(() => {
  setFeedback("Nao foi possivel carregar a validacao anti-bot.", "error");
});
