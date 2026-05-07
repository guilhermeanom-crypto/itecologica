import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import {
  corsHeaders,
  createAdminClient,
  jsonResponse,
  normalizeText,
  requireInternalUser,
  resolveOrigin,
} from "../_shared/diagnosis.ts";

type CreateCrmLeadInteractionInput = {
  lead_id?: string;
  interaction_type?: string;
  interaction_channel?: string | null;
  outcome?: string | null;
  summary?: string;
  next_action?: string | null;
  next_follow_up_at?: string | null;
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

    const body = (await req.json().catch(() => ({}))) as CreateCrmLeadInteractionInput;
    const leadId = normalizeText(body.lead_id);
    const summary = normalizeText(body.summary);
    const interactionType = normalizeText(body.interaction_type) || "whatsapp";

    if (!leadId || !summary) {
      return jsonResponse(400, { error: "lead_id e summary sao obrigatorios." }, origin);
    }

    const { data: lead, error: leadError } = await supabase
      .from("crm_leads_public")
      .select("*")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !lead) {
      return jsonResponse(404, { error: "Lead nao encontrado para registrar interacao." }, origin);
    }

    const interactionChannel = normalizeText(body.interaction_channel) || interactionType;
    const interactionNextAction = normalizeText(body.next_action) || null;
    const interactionNextFollowUp = body.next_follow_up_at || null;
    const interactionTimestamp = new Date().toISOString();

    const { data: interaction, error: interactionError } = await supabase
      .from("crm_lead_interactions")
      .insert([{
        lead_id: leadId,
        interaction_type: interactionType,
        interaction_channel: interactionChannel,
        outcome: normalizeText(body.outcome) || null,
        summary,
        next_action: interactionNextAction,
        next_follow_up_at: interactionNextFollowUp,
        created_by_email: auth.user.email,
        created_by_name: auth.user.fullName,
      }])
      .select("*")
      .single();

    if (interactionError || !interaction) {
      console.error("create-crm-lead-interaction insert error", interactionError);
      return jsonResponse(500, { error: "Nao foi possivel registrar a interacao." }, origin);
    }

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

    const { data: updatedLead, error: updateLeadError } = await supabase
      .from("crm_leads_public")
      .update(leadPatch)
      .eq("id", leadId)
      .select("*")
      .single();

    if (updateLeadError || !updatedLead) {
      console.error("create-crm-lead-interaction lead update error", updateLeadError);
      await supabase.from("crm_lead_interactions").delete().eq("id", interaction.id);
      return jsonResponse(500, { error: "Nao foi possivel sincronizar a interacao com o resumo do lead." }, origin);
    }

    return jsonResponse(200, {
      ok: true,
      interaction,
      lead: updatedLead,
      recorded_by: auth.user.email,
    }, origin);
  } catch (error) {
    console.error("create-crm-lead-interaction unexpected error", error);
    return jsonResponse(500, { error: "Erro inesperado ao registrar a interacao do lead." }, origin);
  }
});
