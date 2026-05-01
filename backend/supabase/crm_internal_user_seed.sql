insert into public.crm_internal_users (email, full_name, role)
values
  ('guilherme.anom@gmail.com', 'Guilherme', 'admin')
on conflict (email) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  active = true;
