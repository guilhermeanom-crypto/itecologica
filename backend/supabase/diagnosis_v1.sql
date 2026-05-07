create extension if not exists pgcrypto;

create or replace function public.set_diagnosis_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.crm_diagnosis_cases (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.crm_leads_public(id) on delete restrict,
  diagnosis_type text not null,
  title text not null,
  status text not null default 'draft'
    check (status in (
      'draft',
      'collecting_inputs',
      'ready_to_run',
      'running',
      'awaiting_human_review',
      'approved',
      'rejected',
      'archived'
    )),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'critical')),
  requested_by_email text,
  assigned_to text,
  briefing_summary text,
  human_review_required boolean not null default true,
  current_run_id uuid,
  approved_at timestamptz,
  approved_by_email text,
  rejected_at timestamptz,
  rejected_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_diagnosis_cases_lead_id
  on public.crm_diagnosis_cases (lead_id);

create index if not exists idx_crm_diagnosis_cases_status
  on public.crm_diagnosis_cases (status);

create index if not exists idx_crm_diagnosis_cases_assigned_to
  on public.crm_diagnosis_cases (assigned_to);

drop trigger if exists trg_crm_diagnosis_cases_updated_at on public.crm_diagnosis_cases;
create trigger trg_crm_diagnosis_cases_updated_at
before update on public.crm_diagnosis_cases
for each row
execute function public.set_diagnosis_updated_at();

create table if not exists public.crm_diagnosis_inputs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.crm_diagnosis_cases(id) on delete cascade,
  version_number integer not null default 1,
  theme text,
  territorial_scope text,
  customer_context text,
  declared_need text,
  known_constraints text,
  json_payload jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, version_number)
);

create index if not exists idx_crm_diagnosis_inputs_case_id
  on public.crm_diagnosis_inputs (case_id, version_number desc);

drop trigger if exists trg_crm_diagnosis_inputs_updated_at on public.crm_diagnosis_inputs;
create trigger trg_crm_diagnosis_inputs_updated_at
before update on public.crm_diagnosis_inputs
for each row
execute function public.set_diagnosis_updated_at();

create table if not exists public.crm_diagnosis_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.crm_diagnosis_cases(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  document_type text,
  source text,
  source_url text,
  uploaded_by_email text,
  ocr_status text not null default 'pending'
    check (ocr_status in ('pending', 'processing', 'completed', 'failed', 'not_required')),
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_crm_diagnosis_documents_case_id
  on public.crm_diagnosis_documents (case_id);

drop trigger if exists trg_crm_diagnosis_documents_updated_at on public.crm_diagnosis_documents;
create trigger trg_crm_diagnosis_documents_updated_at
before update on public.crm_diagnosis_documents
for each row
execute function public.set_diagnosis_updated_at();

create table if not exists public.crm_diagnosis_runs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.crm_diagnosis_cases(id) on delete cascade,
  run_number integer not null,
  status text not null default 'queued'
    check (status in (
      'queued',
      'running_agent_01',
      'running_agent_02',
      'running_agent_04',
      'running_agent_03',
      'awaiting_outputs',
      'awaiting_human_review',
      'completed',
      'failed',
      'cancelled'
    )),
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  model_provider text,
  model_name text,
  execution_mode text not null default 'manual'
    check (execution_mode in ('manual', 'hybrid', 'automated')),
  created_by_email text,
  pipeline_manifest jsonb not null default '{}'::jsonb,
  final_output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, run_number)
);

create index if not exists idx_crm_diagnosis_runs_case_id
  on public.crm_diagnosis_runs (case_id, run_number desc);

create index if not exists idx_crm_diagnosis_runs_status
  on public.crm_diagnosis_runs (status);

drop trigger if exists trg_crm_diagnosis_runs_updated_at on public.crm_diagnosis_runs;
create trigger trg_crm_diagnosis_runs_updated_at
before update on public.crm_diagnosis_runs
for each row
execute function public.set_diagnosis_updated_at();

create table if not exists public.crm_diagnosis_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.crm_diagnosis_runs(id) on delete cascade,
  step_order integer not null,
  step_code text not null,
  agent_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed', 'skipped')),
  prompt_snapshot text,
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, step_order),
  unique (run_id, step_code)
);

create index if not exists idx_crm_diagnosis_run_steps_run_id
  on public.crm_diagnosis_run_steps (run_id, step_order);

drop trigger if exists trg_crm_diagnosis_run_steps_updated_at on public.crm_diagnosis_run_steps;
create trigger trg_crm_diagnosis_run_steps_updated_at
before update on public.crm_diagnosis_run_steps
for each row
execute function public.set_diagnosis_updated_at();

create table if not exists public.crm_diagnosis_artifacts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.crm_diagnosis_cases(id) on delete cascade,
  run_id uuid references public.crm_diagnosis_runs(id) on delete cascade,
  artifact_type text not null,
  storage_path text,
  mime_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists idx_crm_diagnosis_artifacts_case_id
  on public.crm_diagnosis_artifacts (case_id, created_at desc);

alter table public.crm_diagnosis_cases enable row level security;
alter table public.crm_diagnosis_inputs enable row level security;
alter table public.crm_diagnosis_documents enable row level security;
alter table public.crm_diagnosis_runs enable row level security;
alter table public.crm_diagnosis_run_steps enable row level security;
alter table public.crm_diagnosis_artifacts enable row level security;

drop policy if exists "Internal CRM can read diagnosis cases" on public.crm_diagnosis_cases;
create policy "Internal CRM can read diagnosis cases"
  on public.crm_diagnosis_cases
  for select
  to authenticated
  using (public.is_crm_internal_user());

drop policy if exists "Internal CRM can insert diagnosis cases" on public.crm_diagnosis_cases;
create policy "Internal CRM can insert diagnosis cases"
  on public.crm_diagnosis_cases
  for insert
  to authenticated
  with check (public.is_crm_internal_user());

drop policy if exists "Internal CRM can update diagnosis cases" on public.crm_diagnosis_cases;
create policy "Internal CRM can update diagnosis cases"
  on public.crm_diagnosis_cases
  for update
  to authenticated
  using (public.is_crm_internal_user())
  with check (public.is_crm_internal_user());

drop policy if exists "Internal CRM can read diagnosis inputs" on public.crm_diagnosis_inputs;
create policy "Internal CRM can read diagnosis inputs"
  on public.crm_diagnosis_inputs
  for select
  to authenticated
  using (public.is_crm_internal_user());

drop policy if exists "Internal CRM can insert diagnosis inputs" on public.crm_diagnosis_inputs;
create policy "Internal CRM can insert diagnosis inputs"
  on public.crm_diagnosis_inputs
  for insert
  to authenticated
  with check (public.is_crm_internal_user());

drop policy if exists "Internal CRM can update diagnosis inputs" on public.crm_diagnosis_inputs;
create policy "Internal CRM can update diagnosis inputs"
  on public.crm_diagnosis_inputs
  for update
  to authenticated
  using (public.is_crm_internal_user())
  with check (public.is_crm_internal_user());

drop policy if exists "Internal CRM can read diagnosis documents" on public.crm_diagnosis_documents;
create policy "Internal CRM can read diagnosis documents"
  on public.crm_diagnosis_documents
  for select
  to authenticated
  using (public.is_crm_internal_user());

drop policy if exists "Internal CRM can insert diagnosis documents" on public.crm_diagnosis_documents;
create policy "Internal CRM can insert diagnosis documents"
  on public.crm_diagnosis_documents
  for insert
  to authenticated
  with check (public.is_crm_internal_user());

drop policy if exists "Internal CRM can update diagnosis documents" on public.crm_diagnosis_documents;
create policy "Internal CRM can update diagnosis documents"
  on public.crm_diagnosis_documents
  for update
  to authenticated
  using (public.is_crm_internal_user())
  with check (public.is_crm_internal_user());

drop policy if exists "Internal CRM can read diagnosis runs" on public.crm_diagnosis_runs;
create policy "Internal CRM can read diagnosis runs"
  on public.crm_diagnosis_runs
  for select
  to authenticated
  using (public.is_crm_internal_user());

drop policy if exists "Internal CRM can insert diagnosis runs" on public.crm_diagnosis_runs;
create policy "Internal CRM can insert diagnosis runs"
  on public.crm_diagnosis_runs
  for insert
  to authenticated
  with check (public.is_crm_internal_user());

drop policy if exists "Internal CRM can update diagnosis runs" on public.crm_diagnosis_runs;
create policy "Internal CRM can update diagnosis runs"
  on public.crm_diagnosis_runs
  for update
  to authenticated
  using (public.is_crm_internal_user())
  with check (public.is_crm_internal_user());

drop policy if exists "Internal CRM can read diagnosis run steps" on public.crm_diagnosis_run_steps;
create policy "Internal CRM can read diagnosis run steps"
  on public.crm_diagnosis_run_steps
  for select
  to authenticated
  using (public.is_crm_internal_user());

drop policy if exists "Internal CRM can insert diagnosis run steps" on public.crm_diagnosis_run_steps;
create policy "Internal CRM can insert diagnosis run steps"
  on public.crm_diagnosis_run_steps
  for insert
  to authenticated
  with check (public.is_crm_internal_user());

drop policy if exists "Internal CRM can update diagnosis run steps" on public.crm_diagnosis_run_steps;
create policy "Internal CRM can update diagnosis run steps"
  on public.crm_diagnosis_run_steps
  for update
  to authenticated
  using (public.is_crm_internal_user())
  with check (public.is_crm_internal_user());

drop policy if exists "Internal CRM can read diagnosis artifacts" on public.crm_diagnosis_artifacts;
create policy "Internal CRM can read diagnosis artifacts"
  on public.crm_diagnosis_artifacts
  for select
  to authenticated
  using (public.is_crm_internal_user());

drop policy if exists "Internal CRM can insert diagnosis artifacts" on public.crm_diagnosis_artifacts;
create policy "Internal CRM can insert diagnosis artifacts"
  on public.crm_diagnosis_artifacts
  for insert
  to authenticated
  with check (public.is_crm_internal_user());

grant select, insert, update on table public.crm_diagnosis_cases to authenticated;
grant select, insert, update on table public.crm_diagnosis_inputs to authenticated;
grant select, insert, update on table public.crm_diagnosis_documents to authenticated;
grant select, insert, update on table public.crm_diagnosis_runs to authenticated;
grant select, insert, update on table public.crm_diagnosis_run_steps to authenticated;
grant select, insert on table public.crm_diagnosis_artifacts to authenticated;

comment on table public.crm_diagnosis_cases is
  'Casos de diagnostico vinculados a leads do CRM da Itecologica.';

comment on table public.crm_diagnosis_inputs is
  'Versoes da entrada estruturada do caso de diagnostico.';

comment on table public.crm_diagnosis_documents is
  'Documentos anexados ao caso de diagnostico.';

comment on table public.crm_diagnosis_runs is
  'Execucoes do pipeline HABILIS_AI dentro do fluxo da Itecologica.';

comment on table public.crm_diagnosis_run_steps is
  'Etapas orquestradas do pipeline: Agente 01, 02, 04 e 03.';

comment on table public.crm_diagnosis_artifacts is
  'Artefatos gerados pelo diagnostico, como HTML, PDF e JSON final.';
