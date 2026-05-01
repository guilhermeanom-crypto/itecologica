import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type LeadInput = {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  cnpj?: string;
  cnae?: string;
  city?: string;
  state?: string;
  need?: string;
  urgency?: string;
  notes?: string;
  website?: string;
  form_loaded_at?: number;
  captcha_token?: string;
  source_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  consent?: boolean;
};

type TurnstileVerification = {
  ok: boolean;
  code: string;
  detail?: string;
};

type TurnstileApiResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
};

type FirstContactAutomationResult = {
  attempted: boolean;
  status: "skipped" | "pending" | "sent" | "failed" | "invalid_phone";
  channel: "whatsapp";
  phone?: string | null;
  error?: string | null;
  providerMessageId?: string | null;
  templateName?: string | null;
};

type WhatsAppApiSuccess = {
  contacts?: Array<{ wa_id?: string }>;
  messages?: Array<{ id?: string; message_status?: string }>;
};

type WhatsAppApiFailure = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function digitsOnly(value: string) {
  return value.replace(/\D+/g, "");
}

function normalizeBrazilPhoneToWhatsApp(phone: string) {
  const digits = digitsOnly(phone);
  if (!digits) return "";

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return "";
}

function validateLead(input: LeadInput) {
  const required = [
    ["name", normalizeText(input.name)],
    ["company", normalizeText(input.company)],
    ["phone", normalizeText(input.phone)],
    ["city", normalizeText(input.city)],
    ["state", normalizeText(input.state)],
    ["need", normalizeText(input.need)],
    ["urgency", normalizeText(input.urgency)],
  ] as const;

  const missing = required.filter(([, value]) => !value).map(([field]) => field);

  if (!input.consent) {
    missing.push("consent");
  }

  return missing;
}

function buildCors(origin: string) {
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": origin,
    "Content-Type": "application/json",
  };
}

function getAllowedOrigins() {
  return (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveOrigin(req: Request) {
  return req.headers.get("origin")?.trim() || "";
}

function originAllowed(origin: string, allowedOrigins: string[]) {
  return allowedOrigins.includes(origin);
}

function describeTurnstileFailure(code: string) {
  switch (code) {
    case "missing-input-secret":
    case "invalid-input-secret":
      return "Turnstile configurado com chave secreta invalida no servidor.";
    case "missing-input-response":
      return "Token anti-bot ausente. Refaça a validacao e tente novamente.";
    case "invalid-input-response":
      return "Token anti-bot invalido. Refaça a validacao e tente novamente.";
    case "timeout-or-duplicate":
      return "A validacao anti-bot expirou ou ja foi usada. Refaça a verificacao e envie novamente.";
    case "bad-request":
      return "Falha ao validar o anti-bot por formato de requisicao invalido.";
    case "internal-error":
      return "O servico anti-bot falhou temporariamente. Tente novamente em instantes.";
    default:
      return "Falha na validacao anti-bot.";
  }
}

function firstContactAutomationEnabled() {
  return (Deno.env.get("WHATSAPP_FIRST_CONTACT_ENABLED") || "").trim().toLowerCase() === "true";
}

function getWhatsAppApiVersion() {
  return (Deno.env.get("WHATSAPP_API_VERSION") || "v23.0").trim();
}

function getWhatsAppTemplateName() {
  return normalizeText(Deno.env.get("WHATSAPP_TEMPLATE_NAME"));
}

function getWhatsAppTemplateLanguage() {
  return normalizeText(Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE")) || "pt_BR";
}

async function updateLeadFirstContactState(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
  data: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("crm_leads_public")
    .update(data)
    .eq("id", leadId);

  if (error) {
    console.error("update lead first contact state error", { leadId, error });
  }
}

async function logLeadContactAttempt(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("crm_lead_contact_attempts")
    .insert([payload]);

  if (error) {
    console.error("insert lead contact attempt error", { payload, error });
  }
}

async function sendWhatsAppTemplateMessage(phone: string, lead: Record<string, unknown>) {
  const accessToken = normalizeText(Deno.env.get("WHATSAPP_ACCESS_TOKEN"));
  const phoneNumberId = normalizeText(Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"));
  const templateName = getWhatsAppTemplateName();
  const languageCode = getWhatsAppTemplateLanguage();
  const apiVersion = getWhatsAppApiVersion();

  if (!accessToken || !phoneNumberId || !templateName) {
    throw new Error("Automacao WhatsApp sem configuracao completa de token, phone number id ou template.");
  }

  const components = [
    {
      type: "body",
      parameters: [
        { type: "text", text: String(lead.name || "cliente") },
        { type: "text", text: String(lead.company || "empresa") },
        { type: "text", text: String(lead.need || "demanda") },
      ],
    },
  ];

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    }),
  });

  const data = (await response.json()) as WhatsAppApiSuccess & WhatsAppApiFailure;
  if (!response.ok) {
    const errorMessage = data.error?.message || "Falha ao enviar template inicial do WhatsApp.";
    throw new Error(errorMessage);
  }

  return {
    providerMessageId: data.messages?.[0]?.id || null,
    status: data.messages?.[0]?.message_status || "accepted",
    raw: data,
    templateName,
  };
}

async function triggerFirstContactAutomation(
  supabase: ReturnType<typeof createClient>,
  lead: Record<string, unknown>,
) : Promise<FirstContactAutomationResult> {
  const leadId = String(lead.id || "");
  const phone = normalizeBrazilPhoneToWhatsApp(String(lead.phone || ""));

  if (!firstContactAutomationEnabled()) {
    return {
      attempted: false,
      status: "pending",
      channel: "whatsapp",
      phone: phone || null,
      error: null,
      templateName: getWhatsAppTemplateName() || null,
    };
  }

  if (!phone) {
    const error = "Telefone invalido para automacao no WhatsApp. Salve o numero com DDD.";
    await updateLeadFirstContactState(supabase, leadId, {
      whatsapp_phone_e164: null,
      first_contact_channel: "whatsapp",
      first_contact_status: "invalid_phone",
      first_contact_attempted_at: new Date().toISOString(),
      first_contact_error: error,
    });

    await logLeadContactAttempt(supabase, {
      lead_id: leadId,
      channel: "whatsapp",
      direction: "outbound",
      stage: "first_contact",
      status: "invalid_phone",
      provider: "meta_whatsapp_cloud",
      recipient: String(lead.phone || ""),
      error_message: error,
      metadata: { source: "create-public-lead" },
    });

    return {
      attempted: false,
      status: "invalid_phone",
      channel: "whatsapp",
      phone: null,
      error,
      templateName: getWhatsAppTemplateName() || null,
    };
  }

  const attemptedAt = new Date().toISOString();

  try {
    const result = await sendWhatsAppTemplateMessage(phone, lead);

    await updateLeadFirstContactState(supabase, leadId, {
      whatsapp_phone_e164: phone,
      first_contact_channel: "whatsapp",
      first_contact_status: "sent",
      first_contact_attempted_at: attemptedAt,
      first_contact_sent_at: attemptedAt,
      first_contact_error: null,
    });

    await logLeadContactAttempt(supabase, {
      lead_id: leadId,
      channel: "whatsapp",
      direction: "outbound",
      stage: "first_contact",
      status: "sent",
      provider: "meta_whatsapp_cloud",
      recipient: phone,
      template_name: result.templateName,
      provider_message_id: result.providerMessageId,
      metadata: result.raw,
      sent_at: attemptedAt,
    });

    return {
      attempted: true,
      status: "sent",
      channel: "whatsapp",
      phone,
      error: null,
      providerMessageId: result.providerMessageId,
      templateName: result.templateName,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao disparar WhatsApp.";

    await updateLeadFirstContactState(supabase, leadId, {
      whatsapp_phone_e164: phone,
      first_contact_channel: "whatsapp",
      first_contact_status: "failed",
      first_contact_attempted_at: attemptedAt,
      first_contact_error: message,
    });

    await logLeadContactAttempt(supabase, {
      lead_id: leadId,
      channel: "whatsapp",
      direction: "outbound",
      stage: "first_contact",
      status: "failed",
      provider: "meta_whatsapp_cloud",
      recipient: phone,
      template_name: getWhatsAppTemplateName() || null,
      error_message: message,
      metadata: { source: "create-public-lead" },
    });

    return {
      attempted: true,
      status: "failed",
      channel: "whatsapp",
      phone,
      error: message,
      templateName: getWhatsAppTemplateName() || null,
    };
  }
}

async function verifyTurnstile(token: string): Promise<TurnstileVerification> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    return { ok: true, code: "turnstile_not_configured" };
  }

  if (!token) {
    return {
      ok: false,
      code: "turnstile_missing_token",
      detail: describeTurnstileFailure("missing-input-response"),
    };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });

    if (!response.ok) {
      return {
        ok: false,
        code: "turnstile_http_error",
        detail: "Servico anti-bot indisponivel no momento.",
      };
    }

    const data = (await response.json()) as TurnstileApiResponse;
    if (data.success) {
      return { ok: true, code: "turnstile_ok" };
    }

    const errorCode = Array.isArray(data["error-codes"]) && data["error-codes"].length > 0
      ? String(data["error-codes"][0])
      : "unknown";

    console.error("turnstile verification failed", {
      errorCodes: data["error-codes"] || [],
      hostname: data.hostname || null,
      action: data.action || null,
      cdata: data.cdata || null,
    });

    return {
      ok: false,
      code: `turnstile_${errorCode}`,
      detail: describeTurnstileFailure(errorCode),
    };
  } catch (error) {
    console.error("turnstile request error", error);
    return {
      ok: false,
      code: "turnstile_request_error",
      detail: "Nao foi possivel validar o anti-bot no servidor.",
    };
  }
}

serve(async (req) => {
  const origin = resolveOrigin(req);
  const allowedOrigins = getAllowedOrigins();

  if (req.method === "OPTIONS") {
    if (!origin || !originAllowed(origin, allowedOrigins)) {
      return new Response("Origin nao permitida.", { status: 403 });
    }
    return new Response("ok", { headers: buildCors(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo nao permitido." }), {
      status: 405,
      headers: buildCors(origin || "null"),
    });
  }

  try {
    if (!origin || !originAllowed(origin, allowedOrigins)) {
      return new Response(JSON.stringify({ error: "Origin nao permitida." }), {
        status: 403,
        headers: buildCors(origin || "null"),
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("ITESUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL ou chave service role nao configurados.");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = (await req.json()) as LeadInput;
    const missing = validateLead(body);

    if (missing.length > 0) {
      return new Response(JSON.stringify({
        error: "Campos obrigatorios ausentes.",
        missing,
      }), {
        status: 400,
        headers: buildCors(origin),
      });
    }

    if (normalizeText(body.website)) {
      return new Response(JSON.stringify({ error: "Requisicao invalida." }), {
        status: 400,
        headers: buildCors(origin),
      });
    }

    const loadedAt = Number(body.form_loaded_at || 0);
    const now = Date.now();
    if (!loadedAt || now - loadedAt < 2500 || now - loadedAt > 1000 * 60 * 60 * 6) {
      return new Response(JSON.stringify({ error: "Tempo de envio invalido." }), {
        status: 400,
        headers: buildCors(origin),
      });
    }

    const captchaResult = await verifyTurnstile(normalizeText(body.captcha_token));
    if (!captchaResult.ok) {
      return new Response(JSON.stringify({
        error: captchaResult.detail || "Falha na validacao anti-bot.",
        code: captchaResult.code,
      }), {
        status: 400,
        headers: buildCors(origin),
      });
    }

    const payload = {
      name: normalizeText(body.name),
      company: normalizeText(body.company),
      phone: normalizeText(body.phone),
      email: normalizeText(body.email) || null,
      cnpj: normalizeText(body.cnpj) || null,
      cnae: normalizeText(body.cnae) || null,
      city: normalizeText(body.city),
      state: normalizeText(body.state).toUpperCase(),
      need: normalizeText(body.need),
      urgency: normalizeText(body.urgency),
      notes: normalizeText(body.notes) || null,
      source: "landing-page",
      source_page: normalizeText(body.source_page) || null,
      utm_source: normalizeText(body.utm_source) || null,
      utm_medium: normalizeText(body.utm_medium) || null,
      utm_campaign: normalizeText(body.utm_campaign) || null,
      consent: true,
      status: "novo",
      qualification_status: "pendente",
    };

    const { data, error } = await supabase
      .from("crm_leads_public")
      .insert([payload])
      .select("id, created_at, status")
      .single();

    if (error) {
      console.error("insert lead error", error);
      return new Response(JSON.stringify({ error: "Falha ao gravar lead." }), {
        status: 500,
        headers: buildCors(origin),
      });
    }

    const automation = await triggerFirstContactAutomation(supabase, {
      ...payload,
      ...data,
    });

    return new Response(JSON.stringify({
      ok: true,
      lead: data,
      first_contact_automation: automation,
    }), {
      status: 201,
      headers: buildCors(origin),
    });
  } catch (error) {
    console.error("create-public-lead error", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Erro inesperado.",
    }), {
      status: 500,
      headers: buildCors(origin || "null"),
    });
  }
});
