import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import {
  corsHeaders,
  createAdminClient,
  jsonResponse,
  normalizeText,
  requireInternalUser,
  resolveOrigin,
} from "../_shared/diagnosis.ts";

type UpdateCrmLeadInput = {
  lead_id?: string;
  status?: string | null;
  qualification_status?: string | null;
  assigned_to?: string | null;
  first_contact_at?: string | null;
  next_action?: string | null;
  next_follow_up_at?: string | null;
  internal_notes?: string | null;
};

serve(async (req) => {
  const origin = resolveOrigin(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin } });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Metodo nao permitido." }, origin);
  }

  try {
    const supabase = createAdminClient();
    const auth = await requireInternalUser(req, supabase);
    if ("error" in auth) return auth.error;

    const body = (await req.json().catch(() => ({}))) as UpdateCrmLeadInput;
    const leadId = normalizeText(body.lead_id);

    if (!leadId) {
      return jsonResponse(400, { error: "lead_id e obrigatorio." }, origin);
    }

    const { data: lead, error: leadError } = await supabase
      .from("crm_leads_public")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return jsonResponse(404, { error: "Lead nao encontrado." }, origin);
    }

    const payload = {
      status: normalizeText(body.status) || lead.status || "novo",
      qualification_status: normalizeText(body.qualification_status) || lead.qualification_status || "pendente",
      assigned_to: normalizeText(body.assigned_to) || null,
      first_contact_at: body.first_contact_at || null,
      next_action: normalizeText(body.next_action) || null,
      next_follow_up_at: body.next_follow_up_at || null,
      internal_notes: normalizeText(body.internal_notes) || null,
    };

    const { data: updatedLead, error: updateError } = await supabase
      .from("crm_leads_public")
      .update(payload)
      .eq("id", leadId)
      .select("*")
      .single();

    if (updateError || !updatedLead) {
      console.error("update-crm-lead update error", updateError);
      return jsonResponse(500, { error: "Nao foi possivel atualizar o lead." }, origin);
    }

    return jsonResponse(200, {
      ok: true,
      lead: updatedLead,
      updated_by: auth.user.email,
    }, origin);
  } catch (error) {
    console.error("update-crm-lead unexpected error", error);
    return jsonResponse(500, { error: "Erro inesperado ao atualizar o lead." }, origin);
  }
});
