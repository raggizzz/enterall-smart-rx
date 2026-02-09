-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Patients Table
create table if not exists patients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  record text, -- Prontuário
  dob date,
  gender text, -- 'male' or 'female'
  weight numeric,
  height numeric,
  bed text,
  ward text,
  observation text,
  admission_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Formulas Table (Detailed)
create table if not exists formulas (
  id uuid default uuid_generate_v4() primary key,
  code text, -- ex: FNEA07
  manufacturer text,
  commercial_name text not null,
  presentation text, -- ex: frasco 500 mL
  standard_packaging numeric, -- ex: 1000 (mL) or 400 (g)
  billing_unit text, -- 'ml', 'g', 'unit'
  conversion_factor numeric, -- mL/g per unit if applicable
  unit_price numeric,
  caloric_density numeric, -- kcal/mL or kcal/g
  classification text, -- Hiperproteica, etc.
  complexity text, -- Oligomérica, Polimérica
  
  -- Macronutrients (% VET)
  protein_pct numeric,
  carb_pct numeric,
  lipid_pct numeric,
  fiber_g numeric, -- g/100mL or g/100g
  
  -- Micronutrients (mg per 1000mL/packaging)
  potassium_mg numeric,
  phosphorus_mg numeric,
  sodium_mg numeric,
  calcium_mg numeric,
  total_water_ml numeric,
  
  -- Residues (g per 1000mL)
  plastic_g numeric,
  paper_g numeric,
  metal_g numeric,
  glass_g numeric,
  
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Supplies Table (Outros Insumos)
create table if not exists supplies (
  id uuid default uuid_generate_v4() primary key,
  code text,
  name text not null,
  type text, -- 'bottle', 'set', 'other'
  capacity_ml numeric,
  unit_price numeric,
  
  -- Residues
  plastic_g numeric,
  paper_g numeric,
  metal_g numeric,
  glass_g numeric,
  
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Professionals Table
create table if not exists professionals (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  role text, -- 'manager', 'nutritionist', 'technician'
  registration_number text, -- Matrícula
  cpf text,
  cpe text, -- Only for managers
  crn text,
  password_hash text, -- In a real app, use Supabase Auth instead!
  managing_unit text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Prescriptions Table
create table if not exists prescriptions (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references patients(id),
  professional_id uuid references professionals(id), -- Who prescribed
  
  patient_name text,
  patient_record text,
  therapy_type text, -- 'oral', 'enteral', 'parenteral'
  
  -- JSONB columns for complex nested data
  feeding_routes jsonb, -- { oral: boolean, enteral: boolean, ... }
  formulas jsonb,       -- Array of formula objects (snapshot of formula data)
  modules jsonb,        -- Array of module objects
  hydration jsonb,      -- Hydration object
  parenteral jsonb,     -- Parenteral object { access: 'central', bagType: 'manipulated', ... }
  oral_diet jsonb,      -- Oral diet details
  tno_list jsonb,       -- Array of TNO objects
  
  non_intentional_calories numeric,
  total_nutrition jsonb, -- { calories: number, protein: number, ... }
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Daily Evolutions Table
create table if not exists daily_evolutions (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references patients(id),
  prescription_id uuid references prescriptions(id),
  professional_id uuid references professionals(id), -- Who recorded
  
  date date default current_date,
  volume_infused numeric,
  meta_reached numeric, -- Percentage
  intercurrences jsonb, -- Array of strings
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Enable RLS
alter table patients enable row level security;
alter table formulas enable row level security;
alter table supplies enable row level security;
alter table professionals enable row level security;
alter table prescriptions enable row level security;
alter table daily_evolutions enable row level security;

-- 8. Policies (Public Access for MVP)
do $$
declare
  table_name text;
  policy_name text;
begin
  foreach table_name in array array[
    'patients',
    'formulas',
    'supplies',
    'professionals',
    'prescriptions',
    'daily_evolutions'
  ]
  loop
    policy_name := format('Enable all access for %s', table_name);
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = table_name
        and policyname = policy_name
    ) then
      execute format(
        'create policy %I on %I for all using (true) with check (true)',
        policy_name,
        table_name
      );
    end if;
  end loop;
end $$;

-- ============================================================
-- Multi-hospital isolation (logical "database per hospital")
-- ============================================================

create table if not exists hospitals (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists wards (
  id uuid default uuid_generate_v4() primary key,
  hospital_id uuid not null references hospitals(id),
  name text not null,
  code text,
  type text not null default 'other',
  beds integer,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table if exists patients add column if not exists hospital_id uuid references hospitals(id);
alter table if exists formulas add column if not exists hospital_id uuid references hospitals(id);
alter table if exists supplies add column if not exists hospital_id uuid references hospitals(id);
alter table if exists professionals add column if not exists hospital_id uuid references hospitals(id);
alter table if exists prescriptions add column if not exists hospital_id uuid references hospitals(id);
alter table if exists daily_evolutions add column if not exists hospital_id uuid references hospitals(id);

create index if not exists idx_patients_hospital_id on patients(hospital_id);
create index if not exists idx_formulas_hospital_id on formulas(hospital_id);
create index if not exists idx_supplies_hospital_id on supplies(hospital_id);
create index if not exists idx_professionals_hospital_id on professionals(hospital_id);
create index if not exists idx_prescriptions_hospital_id on prescriptions(hospital_id);
create index if not exists idx_daily_evolutions_hospital_id on daily_evolutions(hospital_id);
create index if not exists idx_wards_hospital_id on wards(hospital_id);

alter table if exists hospitals enable row level security;
alter table if exists wards enable row level security;

do $$
begin
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
end $$;

-- 9. Multi-hospital guardrails
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
  if not exists (select 1 from pg_trigger where tgname = 'trg_patients_require_hospital_id') then
    create trigger trg_patients_require_hospital_id
    before insert or update on patients
    for each row execute function enmeta_require_hospital_id();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_formulas_require_hospital_id') then
    create trigger trg_formulas_require_hospital_id
    before insert or update on formulas
    for each row execute function enmeta_require_hospital_id();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_supplies_require_hospital_id') then
    create trigger trg_supplies_require_hospital_id
    before insert or update on supplies
    for each row execute function enmeta_require_hospital_id();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_professionals_require_hospital_id') then
    create trigger trg_professionals_require_hospital_id
    before insert or update on professionals
    for each row execute function enmeta_require_hospital_id();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_prescriptions_validate_hospital') then
    create trigger trg_prescriptions_validate_hospital
    before insert or update on prescriptions
    for each row execute function enmeta_validate_prescription_hospital();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_daily_evolutions_validate_hospital') then
    create trigger trg_daily_evolutions_validate_hospital
    before insert or update on daily_evolutions
    for each row execute function enmeta_validate_evolution_hospital();
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'professionals_role_check'
  ) then
    alter table professionals drop constraint professionals_role_check;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'professionals_role_allowed_check'
  ) then
    alter table professionals
      add constraint professionals_role_allowed_check
      check (role in ('manager', 'general_manager', 'local_manager', 'nutritionist', 'technician'));
  end if;
end $$;
