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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
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
create policy "Enable all access for patients" on patients for all using (true) with check (true);
create policy "Enable all access for formulas" on formulas for all using (true) with check (true);
create policy "Enable all access for supplies" on supplies for all using (true) with check (true);
create policy "Enable all access for professionals" on professionals for all using (true) with check (true);
create policy "Enable all access for prescriptions" on prescriptions for all using (true) with check (true);
create policy "Enable all access for daily_evolutions" on daily_evolutions for all using (true) with check (true);
