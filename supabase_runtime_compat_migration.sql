-- ============================================================
-- ENMeta runtime compatibility migration
-- Goal: align existing databases with the current frontend model
-- Run in Supabase SQL Editor (idempotent)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- prescriptions: add modern columns while keeping legacy JSON model
-- ------------------------------------------------------------
alter table if exists prescriptions add column if not exists patient_bed text;
alter table if exists prescriptions add column if not exists patient_ward text;
alter table if exists prescriptions add column if not exists professional_name text;
alter table if exists prescriptions add column if not exists system_type text;
alter table if exists prescriptions add column if not exists feeding_route text;
alter table if exists prescriptions add column if not exists infusion_mode text;
alter table if exists prescriptions add column if not exists infusion_rate_ml_h numeric;
alter table if exists prescriptions add column if not exists infusion_drops_min numeric;
alter table if exists prescriptions add column if not exists infusion_hours_per_day numeric;
alter table if exists prescriptions add column if not exists equipment_volume numeric;
alter table if exists prescriptions add column if not exists hydration_volume numeric;
alter table if exists prescriptions add column if not exists hydration_schedules jsonb;
alter table if exists prescriptions add column if not exists total_calories numeric;
alter table if exists prescriptions add column if not exists total_protein numeric;
alter table if exists prescriptions add column if not exists total_carbs numeric;
alter table if exists prescriptions add column if not exists total_fat numeric;
alter table if exists prescriptions add column if not exists total_fiber numeric;
alter table if exists prescriptions add column if not exists total_volume numeric;
alter table if exists prescriptions add column if not exists total_free_water numeric;
alter table if exists prescriptions add column if not exists nursing_time_minutes numeric;
alter table if exists prescriptions add column if not exists nursing_cost_total numeric;
alter table if exists prescriptions add column if not exists material_cost_total numeric;
alter table if exists prescriptions add column if not exists total_cost numeric;
alter table if exists prescriptions add column if not exists status text;
alter table if exists prescriptions add column if not exists start_date date;
alter table if exists prescriptions add column if not exists end_date date;
alter table if exists prescriptions add column if not exists notes text;
alter table if exists prescriptions add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

update prescriptions
set status = coalesce(status, 'active'),
    start_date = coalesce(start_date, created_at::date),
    updated_at = coalesce(updated_at, timezone('utc'::text, now()));

create index if not exists idx_prescriptions_patient_status on prescriptions(patient_id, status);
create index if not exists idx_prescriptions_start_end_date on prescriptions(start_date, end_date);

-- ------------------------------------------------------------
-- daily_evolutions: notes/update compatibility
-- ------------------------------------------------------------
alter table if exists daily_evolutions add column if not exists notes text;
alter table if exists daily_evolutions add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

update daily_evolutions
set updated_at = coalesce(updated_at, timezone('utc'::text, now()));

-- ------------------------------------------------------------
-- app_settings: ensure table/columns exist
-- ------------------------------------------------------------
create table if not exists app_settings (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid references hospitals(id),
  hospital_name text not null default 'Unidade',
  hospital_logo text,
  default_signatures jsonb,
  label_settings jsonb,
  nursing_costs jsonb,
  indirect_costs jsonb,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

alter table if exists app_settings add column if not exists hospital_id uuid references hospitals(id);
alter table if exists app_settings add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
create unique index if not exists uq_app_settings_hospital_id on app_settings(hospital_id) where hospital_id is not null;

-- ------------------------------------------------------------
-- app_tools: ensure hospital-scoped column exists
-- ------------------------------------------------------------
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

alter table if exists app_tools add column if not exists hospital_id uuid references hospitals(id);
create index if not exists idx_app_tools_hospital_id on app_tools(hospital_id);

-- ------------------------------------------------------------
-- professionals: active flag/update compatibility
-- ------------------------------------------------------------
alter table if exists professionals add column if not exists is_active boolean default true;
alter table if exists professionals add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

update professionals
set is_active = coalesce(is_active, true),
    updated_at = coalesce(updated_at, timezone('utc'::text, now()));

-- ------------------------------------------------------------
-- professionals role compatibility
-- ------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'professionals_role_check') then
    alter table professionals drop constraint professionals_role_check;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'professionals_role_allowed_check') then
    alter table professionals
      add constraint professionals_role_allowed_check
      check (role in ('manager', 'general_manager', 'local_manager', 'nutritionist', 'technician'));
  end if;
end $$;
