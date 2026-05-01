create extension if not exists pgcrypto;

alter table public.crm_leads_public
  add column if not exists whatsapp_phone_e164 text,
  add column if not exists first_contact_channel text,
  add column if not exists first_contact_status text not null default 'pending',
  add column if not exists first_contact_attempted_at timestamptz,
  add column if not exists first_contact_sent_at timestamptz,
  add column if not exists first_contact_replied_at timestamptz,
  add column if not exists first_contact_error text;

create table if not exists public.crm_lead_contact_attempts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads_public(id) on delete cascade,
  channel text not null default 'whatsapp',
  direction text not null default 'outbound',
  stage text not null default 'first_contact',
  status text not null default 'queued',
  provider text not null default 'meta_whatsapp_cloud',
  recipient text,
  template_name text,
  message_text text,
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_lead_contact_attempts_lead_id
  on public.crm_lead_contact_attempts (lead_id, created_at desc);

create index if not exists idx_crm_lead_contact_attempts_status
  on public.crm_lead_contact_attempts (status, created_at desc);

alter table public.crm_lead_contact_attempts enable row level security;

create or replace function public.set_crm_lead_contact_attempts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_crm_lead_contact_attempts_updated_at on public.crm_lead_contact_attempts;
create trigger trg_crm_lead_contact_attempts_updated_at
before update on public.crm_lead_contact_attempts
for each row
execute function public.set_crm_lead_contact_attempts_updated_at();

drop policy if exists "Internal CRM can read contact attempts" on public.crm_lead_contact_attempts;
create policy "Internal CRM can read contact attempts"
  on public.crm_lead_contact_attempts
  for select
  to authenticated
  using (public.is_crm_internal_user());

grant usage on schema public to authenticated;
grant select on table public.crm_lead_contact_attempts to authenticated;

comment on table public.crm_lead_contact_attempts is
  'Historico operacional das tentativas de contato do CRM, incluindo automacoes via WhatsApp.';
