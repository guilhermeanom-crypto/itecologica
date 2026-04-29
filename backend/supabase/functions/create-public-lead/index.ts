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

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

async function verifyTurnstile(token: string, ip: string | null) {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true;

  if (!token) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });

  if (!response.ok) return false;
  const data = await response.json();
  return Boolean(data.success);
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados.");
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

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const captchaOk = await verifyTurnstile(normalizeText(body.captcha_token), clientIp);
    if (!captchaOk) {
      return new Response(JSON.stringify({ error: "Falha na validacao anti-bot." }), {
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

    return new Response(JSON.stringify({
      ok: true,
      lead: data,
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
