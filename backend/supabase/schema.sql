create extension if not exists pgcrypto;

create table if not exists public.crm_leads_public (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  phone text not null,
  email text,
  cnpj text,
  cnae text,
  city text not null,
  state text not null,
  need text not null,
  urgency text not null default 'media',
  notes text,
  source text not null default 'landing-page',
  source_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  consent boolean not null default false,
  status text not null default 'novo',
  qualification_status text not null default 'pendente',
  assigned_to text,
  first_contact_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_leads_public_created_at
  on public.crm_leads_public (created_at desc);

create index if not exists idx_crm_leads_public_status
  on public.crm_leads_public (status);

create index if not exists idx_crm_leads_public_phone
  on public.crm_leads_public (phone);

create index if not exists idx_crm_leads_public_email
  on public.crm_leads_public (email);

alter table public.crm_leads_public enable row level security;

-- Nao crie politica de insert anonimo.
-- A gravacao publica deve acontecer somente via edge function com service role.
--
-- Quando existir painel interno autenticado, crie politicas especificas para leitura
-- e atualizacao apenas para o(s) usuario(s) internos corretos.
--
-- Exemplo futuro:
-- create policy "Leitura interna"
--   on public.crm_leads_public
--   for select
--   to authenticated
--   using ((auth.jwt() ->> 'email') in ('voce@seudominio.com'));

create or replace function public.set_crm_lead_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_crm_leads_public_updated_at on public.crm_leads_public;
create trigger trg_crm_leads_public_updated_at
before update on public.crm_leads_public
for each row
execute function public.set_crm_lead_updated_at();
