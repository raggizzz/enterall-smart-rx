import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://modmqstvraatkqgishaf.supabase.co";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vZG1xc3R2cmFhdGtxZ2lzaGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDU0MTIsImV4cCI6MjA4NDA4MTQxMn0.HPyy1ekQN77Aly2nViOdXXWQkNqOc9IlNbTdiWMCqi0";

const HOSPITAL_NAME = process.env.ENMETA_HOSPITAL_NAME || "Hospital ENMeta Demo";
const WARD_NAME = process.env.ENMETA_WARD_NAME || "Unidade 01";
const MANAGER_REG = process.env.ENMETA_MANAGER_REG || "100000";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function ensureHospital() {
  const { data: existing, error } = await supabase
    .from("hospitals")
    .select("id,name")
    .eq("name", HOSPITAL_NAME)
    .limit(1);
  if (error) throw error;
  if (existing?.length) return existing[0];

  const { data: created, error: insertError } = await supabase
    .from("hospitals")
    .insert({ name: HOSPITAL_NAME, is_active: true })
    .select("id,name")
    .single();
  if (insertError) throw insertError;
  return created;
}

async function ensureWard(hospitalId) {
  const { data: existing, error } = await supabase
    .from("wards")
    .select("id,name")
    .eq("hospital_id", hospitalId)
    .eq("name", WARD_NAME)
    .limit(1);

  if (error) throw error;
  if (existing?.length) return existing[0];

  const { data: created, error: insertError } = await supabase
    .from("wards")
    .insert({
      hospital_id: hospitalId,
      name: WARD_NAME,
      type: "enfermaria",
      is_active: true,
    })
    .select("id,name")
    .single();
  if (insertError) throw insertError;
  return created;
}

async function ensureManager(hospitalId) {
  const { data: existing, error } = await supabase
    .from("professionals")
    .select("id,name,registration_number,role,is_active")
    .eq("hospital_id", hospitalId)
    .eq("registration_number", MANAGER_REG)
    .limit(1);
  if (error) throw error;
  if (existing?.length) return existing[0];

  const basePayload = {
    hospital_id: hospitalId,
    name: "Gerente Geral ENMeta",
    role: "manager",
    registration_number: MANAGER_REG,
    managing_unit: WARD_NAME,
  };

  let { data: created, error: insertError } = await supabase
    .from("professionals")
    .insert({ ...basePayload, is_active: true })
    .select("id,name,registration_number,role,is_active")
    .single();

  if (insertError && insertError.message?.includes("is_active")) {
    const fallback = await supabase
      .from("professionals")
      .insert(basePayload)
      .select("id,name,registration_number,role")
      .single();
    created = fallback.data;
    insertError = fallback.error;
  }

  if (insertError) throw insertError;
  return created;
}

try {
  const hospital = await ensureHospital();
  const ward = await ensureWard(hospital.id);
  const manager = await ensureManager(hospital.id);

  console.log(
    JSON.stringify(
      {
        ok: true,
        hospital,
        ward,
        manager,
        login: {
          hospital: HOSPITAL_NAME,
          unidade: WARD_NAME,
          funcao: "Gestor geral",
          matricula: MANAGER_REG,
          senha: "qualquer valor",
        },
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
}
