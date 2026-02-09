-- ============================================================
-- ENMeta - Permissions matrix + tools catalog migration
-- Run in Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

-- 0) Multi-hospital isolation columns
create table if not exists hospitals (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  cnes text,
  cep text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create table if not exists wards (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references hospitals(id),
  name text not null,
  code text,
  type text not null default 'other',
  beds integer,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table if exists patients add column if not exists hospital_id uuid references hospitals(id);
alter table if exists formulas add column if not exists hospital_id uuid references hospitals(id);
alter table if exists modules add column if not exists hospital_id uuid references hospitals(id);
alter table if exists supplies add column if not exists hospital_id uuid references hospitals(id);
alter table if exists professionals add column if not exists hospital_id uuid references hospitals(id);
alter table if exists prescriptions add column if not exists hospital_id uuid references hospitals(id);
alter table if exists daily_evolutions add column if not exists hospital_id uuid references hospitals(id);
alter table if exists clinics add column if not exists hospital_id uuid references hospitals(id);
alter table if exists app_settings add column if not exists hospital_id uuid references hospitals(id);

create index if not exists idx_patients_hospital_id on patients(hospital_id);
create index if not exists idx_formulas_hospital_id on formulas(hospital_id);
create index if not exists idx_modules_hospital_id on modules(hospital_id);
create index if not exists idx_supplies_hospital_id on supplies(hospital_id);
create index if not exists idx_professionals_hospital_id on professionals(hospital_id);
create index if not exists idx_prescriptions_hospital_id on prescriptions(hospital_id);
create index if not exists idx_daily_evolutions_hospital_id on daily_evolutions(hospital_id);
create index if not exists idx_clinics_hospital_id on clinics(hospital_id);
create index if not exists idx_app_settings_hospital_id on app_settings(hospital_id);
create index if not exists idx_wards_hospital_id on wards(hospital_id);
create unique index if not exists uq_app_settings_hospital_id on app_settings(hospital_id) where hospital_id is not null;

-- Backfill basic relations when possible
update prescriptions p
set hospital_id = pt.hospital_id
from patients pt
where p.hospital_id is null
  and p.patient_id = pt.id
  and pt.hospital_id is not null;

update daily_evolutions e
set hospital_id = p.hospital_id
from prescriptions p
where e.hospital_id is null
  and e.prescription_id = p.id
  and p.hospital_id is not null;

-- Guardrails: enforce hospital ownership in writes
create or replace function enmeta_require_hospital_id()
returns trigger
language plpgsql
as $$
begin
  if new.hospital_id is null then
    raise exception 'hospital_id is required for table %', tg_table_name;
  end if;
  return new;
end;
$$;

create or replace function enmeta_validate_prescription_hospital()
returns trigger
language plpgsql
as $$
declare
  patient_hospital uuid;
  professional_hospital uuid;
begin
  if new.hospital_id is null then
    raise exception 'hospital_id is required in prescriptions';
  end if;

  if new.patient_id is not null then
    select hospital_id into patient_hospital
    from patients
    where id = new.patient_id;

    if patient_hospital is not null and patient_hospital <> new.hospital_id then
      raise exception 'patient hospital_id differs from prescription hospital_id';
    end if;
  end if;

  if new.professional_id is not null then
    select hospital_id into professional_hospital
    from professionals
    where id = new.professional_id;

    if professional_hospital is not null and professional_hospital <> new.hospital_id then
      raise exception 'professional hospital_id differs from prescription hospital_id';
    end if;
  end if;

  return new;
end;
$$;

create or replace function enmeta_validate_evolution_hospital()
returns trigger
language plpgsql
as $$
declare
  patient_hospital uuid;
  prescription_hospital uuid;
  professional_hospital uuid;
begin
  if new.hospital_id is null then
    raise exception 'hospital_id is required in daily_evolutions';
  end if;

  if new.patient_id is not null then
    select hospital_id into patient_hospital
    from patients
    where id = new.patient_id;

    if patient_hospital is not null and patient_hospital <> new.hospital_id then
      raise exception 'patient hospital_id differs from daily_evolution hospital_id';
    end if;
  end if;

  if new.prescription_id is not null then
    select hospital_id into prescription_hospital
    from prescriptions
    where id = new.prescription_id;

    if prescription_hospital is not null and prescription_hospital <> new.hospital_id then
      raise exception 'prescription hospital_id differs from daily_evolution hospital_id';
    end if;
  end if;

  if new.professional_id is not null then
    select hospital_id into professional_hospital
    from professionals
    where id = new.professional_id;

    if professional_hospital is not null and professional_hospital <> new.hospital_id then
      raise exception 'professional hospital_id differs from daily_evolution hospital_id';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.patients') is not null and not exists (select 1 from pg_trigger where tgname = 'trg_patients_require_hospital_id') then
    create trigger trg_patients_require_hospital_id
    before insert or update on patients
    for each row execute function enmeta_require_hospital_id();
  end if;

  if to_regclass('public.formulas') is not null and not exists (select 1 from pg_trigger where tgname = 'trg_formulas_require_hospital_id') then
    create trigger trg_formulas_require_hospital_id
    before insert or update on formulas
    for each row execute function enmeta_require_hospital_id();
  end if;

  if to_regclass('public.modules') is not null and not exists (select 1 from pg_trigger where tgname = 'trg_modules_require_hospital_id') then
    create trigger trg_modules_require_hospital_id
    before insert or update on modules
    for each row execute function enmeta_require_hospital_id();
  end if;

  if to_regclass('public.supplies') is not null and not exists (select 1 from pg_trigger where tgname = 'trg_supplies_require_hospital_id') then
    create trigger trg_supplies_require_hospital_id
    before insert or update on supplies
    for each row execute function enmeta_require_hospital_id();
  end if;

  if to_regclass('public.professionals') is not null and not exists (select 1 from pg_trigger where tgname = 'trg_professionals_require_hospital_id') then
    create trigger trg_professionals_require_hospital_id
    before insert or update on professionals
    for each row execute function enmeta_require_hospital_id();
  end if;

  if to_regclass('public.clinics') is not null and not exists (select 1 from pg_trigger where tgname = 'trg_clinics_require_hospital_id') then
    create trigger trg_clinics_require_hospital_id
    before insert or update on clinics
    for each row execute function enmeta_require_hospital_id();
  end if;

  if to_regclass('public.app_settings') is not null and not exists (select 1 from pg_trigger where tgname = 'trg_app_settings_require_hospital_id') then
    create trigger trg_app_settings_require_hospital_id
    before insert or update on app_settings
    for each row execute function enmeta_require_hospital_id();
  end if;

  if to_regclass('public.prescriptions') is not null and not exists (select 1 from pg_trigger where tgname = 'trg_prescriptions_validate_hospital') then
    create trigger trg_prescriptions_validate_hospital
    before insert or update on prescriptions
    for each row execute function enmeta_validate_prescription_hospital();
  end if;

  if to_regclass('public.daily_evolutions') is not null and not exists (select 1 from pg_trigger where tgname = 'trg_daily_evolutions_validate_hospital') then
    create trigger trg_daily_evolutions_validate_hospital
    before insert or update on daily_evolutions
    for each row execute function enmeta_validate_evolution_hospital();
  end if;
end $$;

-- 1) Role permissions matrix (driven by spreadsheet)
create table if not exists role_permissions (
  id uuid primary key default uuid_generate_v4(),
  role text not null check (role in ('general_manager', 'local_manager', 'nutritionist', 'technician')),
  permission_key text not null check (
    permission_key in (
      'manage_units',
      'manage_wards',
      'manage_professionals',
      'manage_managers',
      'manage_supplies',
      'manage_formulas',
      'manage_costs',
      'manage_patients',
      'move_patients',
      'manage_reports'
    )
  ),
  allowed boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  unique (role, permission_key)
);

insert into role_permissions (role, permission_key, allowed) values
  -- Gestor geral
  ('general_manager', 'manage_units', true),
  ('general_manager', 'manage_wards', true),
  ('general_manager', 'manage_managers', true),
  ('general_manager', 'manage_professionals', true),
  ('general_manager', 'manage_supplies', true),
  ('general_manager', 'manage_formulas', true),
  ('general_manager', 'manage_costs', true),
  ('general_manager', 'manage_patients', true),
  ('general_manager', 'move_patients', true),
  ('general_manager', 'manage_reports', true),

  -- Gestor local
  ('local_manager', 'manage_units', false),
  ('local_manager', 'manage_wards', true),
  ('local_manager', 'manage_managers', false),
  ('local_manager', 'manage_professionals', true),
  ('local_manager', 'manage_supplies', true),
  ('local_manager', 'manage_formulas', true),
  ('local_manager', 'manage_costs', true),
  ('local_manager', 'manage_patients', true),
  ('local_manager', 'move_patients', true),
  ('local_manager', 'manage_reports', true),

  -- Nutricionista
  ('nutritionist', 'manage_units', false),
  ('nutritionist', 'manage_wards', false),
  ('nutritionist', 'manage_managers', false),
  ('nutritionist', 'manage_professionals', true),
  ('nutritionist', 'manage_supplies', false),
  ('nutritionist', 'manage_formulas', false),
  ('nutritionist', 'manage_costs', false),
  ('nutritionist', 'manage_patients', true),
  ('nutritionist', 'move_patients', true),
  ('nutritionist', 'manage_reports', true),

  -- Tecnico
  ('technician', 'manage_units', false),
  ('technician', 'manage_wards', false),
  ('technician', 'manage_managers', false),
  ('technician', 'manage_professionals', true),
  ('technician', 'manage_supplies', false),
  ('technician', 'manage_formulas', false),
  ('technician', 'manage_costs', false),
  ('technician', 'manage_patients', true),
  ('technician', 'move_patients', false),
  ('technician', 'manage_reports', true)
on conflict (role, permission_key) do update
set allowed = excluded.allowed,
    updated_at = timezone('utc'::text, now());

-- 2) Tools catalog (from Ferramentas do app.xlsx)
create table if not exists app_tools (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid references hospitals(id),
  code text not null unique,
  name text not null,
  category text not null,
  description text,
  link text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

insert into app_tools (code, name, category, description, link, is_active) values
  ('PESO_ALTURA', 'Estimativa de peso e altura', 'antropometria', 'Altura do joelho e circunferencia de braco (Chumlea).', null, true),
  ('GIDS', 'Escore GIDS', 'triagem', 'Escore de disfuncao gastrointestinal para paciente critico.', null, true),
  ('DVA', 'Dose de drogas vasoativas', 'critico', 'Calculo de dose para noradrenalina e vasopressina.', null, true),
  ('NRS', 'Triagem NRS 2002', 'triagem', 'Triagem de risco nutricional NRS.', null, true),
  ('BALANCO_N', 'Balanco nitrogenado', 'metabolico', 'Calculo de balanco nitrogenado 24h.', null, true),
  ('GASTO_ENERGETICO', 'Estimativa de gasto energetico', 'metabolico', 'Ireton-Jones, Harris-Benedict e formula de bolso.', null, true),
  ('GLIM', 'Diagnostico GLIM', 'triagem', 'Classificacao de desnutricao segundo GLIM.', null, true),
  ('LINK_SBNPE', 'Diretrizes SBNPE', 'links', 'Acesso a diretrizes SBNPE.', 'https://www.sbnpe.org.br/diretrizes', true),
  ('LINK_ESPEN', 'Guidelines ESPEN', 'links', 'Acesso a guidelines ESPEN.', 'https://www.espen.org/guidelines-home/espen-guidelines', true),
  ('LINK_ASPEN', 'Guidelines ASPEN', 'links', 'Acesso a guidelines ASPEN.', 'https://nutritioncare.org/clinical-resources/guidelines-standards/', true),
  ('LINK_MAN', 'Formulario MAN', 'links', 'Mini Nutritional Assessment.', 'https://www.mna-elderly.com/sites/default/files/2024-10/MNA_AU2.0_%20por-BR_nonMapi.pdf', true),
  ('LINK_GMFCS', 'GMFCS em portugues', 'links', 'Sistema de classificacao motora grossa.', 'https://canchild.ca/wp-content/uploads/2025/03/GMFCS-ER_Translation-Portuguese2.pdf', true),
  ('LINK_OMS', 'Curvas de crescimento OMS', 'links', 'Curvas de crescimento OMS.', 'https://www.sbp.com.br/departamentos/endocrinologia/graficos-de-crescimento/', true),
  ('LINK_PC', 'Curvas para criancas com paralisia cerebral', 'links', 'Curvas especificas para paralisia cerebral.', 'https://www.lifeexpectancy.org/Articles/NewGrowthCharts.shtml', true)
on conflict (code) do update
set name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    link = excluded.link,
    is_active = excluded.is_active,
    updated_at = timezone('utc'::text, now());

-- 3) Optional hardening for professionals.role
do $$
begin
  alter table if exists hospitals enable row level security;
  alter table if exists wards enable row level security;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='hospitals' and policyname='Enable all access for hospitals'
  ) then
    create policy "Enable all access for hospitals"
      on hospitals for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='wards' and policyname='Enable all access for wards'
  ) then
    create policy "Enable all access for wards"
      on wards for all using (true) with check (true);
  end if;

  if exists (
    select 1
    from pg_constraint
    where conname = 'professionals_role_check'
  ) then
    alter table professionals drop constraint professionals_role_check;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'professionals_role_allowed_check'
  ) then
    alter table professionals
      add constraint professionals_role_allowed_check
      check (role in ('manager', 'general_manager', 'local_manager', 'nutritionist', 'technician'));
  end if;
end $$;

-- 4) RLS policies for new tables
alter table role_permissions enable row level security;
alter table app_tools enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='role_permissions' and policyname='Enable all access for role_permissions'
  ) then
    create policy "Enable all access for role_permissions"
      on role_permissions for all using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='app_tools' and policyname='Enable all access for app_tools'
  ) then
create policy "Enable all access for app_tools"
      on app_tools for all using (true) with check (true);
  end if;
end $$;
