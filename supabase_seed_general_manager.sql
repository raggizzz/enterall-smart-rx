-- ============================================================
-- ENMeta - Seed de acesso inicial (hospital + unidade + gestor)
-- Execute no Supabase SQL Editor
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists hospitals (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
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

do $$
declare
  v_hospital_id uuid;
  v_ward_name text := 'Unidade 01';
  v_hospital_name text := 'Hospital ENMeta Demo';
  v_registration text := '100000';
begin
  select id
  into v_hospital_id
  from hospitals
  where name = v_hospital_name
  limit 1;

  if v_hospital_id is null then
    insert into hospitals (name, is_active)
    values (v_hospital_name, true)
    returning id into v_hospital_id;
  end if;

  if not exists (
    select 1 from wards where hospital_id = v_hospital_id and name = v_ward_name
  ) then
    insert into wards (hospital_id, name, type, is_active)
    values (v_hospital_id, v_ward_name, 'enfermaria', true);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'professionals'
      and column_name = 'is_active'
  ) then
    if not exists (
      select 1 from professionals where hospital_id = v_hospital_id and registration_number = v_registration
    ) then
      insert into professionals (
        hospital_id, name, role, registration_number, managing_unit, is_active
      ) values (
        v_hospital_id, 'Gerente Geral ENMeta', 'manager', v_registration, v_ward_name, true
      );
    end if;
  else
    if not exists (
      select 1 from professionals where hospital_id = v_hospital_id and registration_number = v_registration
    ) then
      insert into professionals (
        hospital_id, name, role, registration_number, managing_unit
      ) values (
        v_hospital_id, 'Gerente Geral ENMeta', 'manager', v_registration, v_ward_name
      );
    end if;
  end if;
end $$;

-- Login:
-- Hospital: Hospital ENMeta Demo
-- Unidade:  Unidade 01
-- Funcao:   Gestor geral
-- Matricula: 100000
-- Senha: qualquer valor (senha ainda nao validada no frontend)
