alter table public.crm_leads_public
  add column if not exists internal_notes text;

create table if not exists public.crm_internal_users (
  email text primary key,
  full_name text,
  role text not null default 'comercial',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_internal_users enable row level security;

create or replace function public.set_crm_internal_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_crm_internal_users_updated_at on public.crm_internal_users;
create trigger trg_crm_internal_users_updated_at
before update on public.crm_internal_users
for each row
execute function public.set_crm_internal_users_updated_at();

create or replace function public.is_crm_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crm_internal_users
    where email = (auth.jwt() ->> 'email')
      and active = true
  );
$$;

drop policy if exists "CRM user can read own access row" on public.crm_internal_users;
create policy "CRM user can read own access row"
  on public.crm_internal_users
  for select
  to authenticated
  using (email = (auth.jwt() ->> 'email'));

drop policy if exists "Internal CRM can read leads" on public.crm_leads_public;
create policy "Internal CRM can read leads"
  on public.crm_leads_public
  for select
  to authenticated
  using (public.is_crm_internal_user());

drop policy if exists "Internal CRM can update leads" on public.crm_leads_public;
create policy "Internal CRM can update leads"
  on public.crm_leads_public
  for update
  to authenticated
  using (public.is_crm_internal_user())
  with check (public.is_crm_internal_user());

grant usage on schema public to authenticated;
grant select on table public.crm_internal_users to authenticated;
grant select, update on table public.crm_leads_public to authenticated;
grant execute on function public.is_crm_internal_user() to authenticated;

comment on table public.crm_internal_users is
  'Usuarios internos autorizados a acessar o CRM da Itecologica.';
