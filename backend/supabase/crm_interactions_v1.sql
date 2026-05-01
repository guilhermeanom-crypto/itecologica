create extension if not exists pgcrypto;

alter table public.crm_leads_public
  add column if not exists next_action text,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_interaction_at timestamptz,
  add column if not exists last_interaction_summary text;

create table if not exists public.crm_lead_interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads_public(id) on delete cascade,
  interaction_type text not null default 'whatsapp',
  interaction_channel text,
  outcome text,
  summary text not null,
  next_action text,
  next_follow_up_at timestamptz,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_lead_interactions_lead_id_created_at
  on public.crm_lead_interactions (lead_id, created_at desc);

create index if not exists idx_crm_leads_public_next_follow_up_at
  on public.crm_leads_public (next_follow_up_at asc);

alter table public.crm_lead_interactions enable row level security;

drop policy if exists "Internal CRM can read lead interactions" on public.crm_lead_interactions;
create policy "Internal CRM can read lead interactions"
  on public.crm_lead_interactions
  for select
  to authenticated
  using (public.is_crm_internal_user());

drop policy if exists "Internal CRM can insert lead interactions" on public.crm_lead_interactions;
create policy "Internal CRM can insert lead interactions"
  on public.crm_lead_interactions
  for insert
  to authenticated
  with check (public.is_crm_internal_user());

grant usage on schema public to authenticated;
grant select, insert on table public.crm_lead_interactions to authenticated;
grant select, update on table public.crm_leads_public to authenticated;

comment on table public.crm_lead_interactions is
  'Historico operacional de contatos, retornos e notas registradas no CRM.';
