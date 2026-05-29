-- Exemplos de consultas para analise gerencial no PostgreSQL.
-- Ajuste as datas e o hospital conforme necessidade.

-- 1. Ranking de dietas por volume prescrito no periodo.
select
  h.name as hospital,
  f.name as formula,
  f.manufacturer as fabricante,
  sum(pf.volume * pf."timesPerDay") as volume_prescrito_dia_base_ml,
  count(distinct p.id) as prescricoes,
  count(distinct p."patientId") as pacientes_unicos
from "PrescriptionFormula" pf
join "Prescription" p on p.id = pf."prescriptionId"
join "Formula" f on f.id = pf."formulaId"
left join "Hospital" h on h.id = p."hospitalId"
where p."startDate" <= date '2026-05-31'
  and coalesce(p."endDate", date '2026-05-31') >= date '2026-05-01'
  and p.status <> 'cancelled'
group by h.name, f.name, f.manufacturer
order by volume_prescrito_dia_base_ml desc;

-- 2. Saida estimada considerando dias de sobreposicao da prescricao com o periodo.
with periodo as (
  select date '2026-05-01' as inicio, date '2026-05-31' as fim
),
prescricoes_periodo as (
  select
    p.*,
    greatest(p."startDate"::date, periodo.inicio) as inicio_calculo,
    least(coalesce(p."endDate"::date, periodo.fim), periodo.fim) as fim_calculo
  from "Prescription" p
  cross join periodo
  where p."startDate"::date <= periodo.fim
    and coalesce(p."endDate"::date, periodo.fim) >= periodo.inicio
    and p.status <> 'cancelled'
)
select
  h.name as hospital,
  f.name as formula,
  sum(pf.volume * pf."timesPerDay" * (pp.fim_calculo - pp.inicio_calculo + 1)) as volume_total_estimado_ml,
  count(distinct pp."patientId") as pacientes_unicos,
  count(distinct pp.id) as prescricoes
from prescricoes_periodo pp
join "PrescriptionFormula" pf on pf."prescriptionId" = pp.id
join "Formula" f on f.id = pf."formulaId"
left join "Hospital" h on h.id = pp."hospitalId"
group by h.name, f.name
order by volume_total_estimado_ml desc;

-- 3. Volume prescrito versus volume infundido por dia.
select
  h.name as hospital,
  de.date::date as data,
  count(distinct de."patientId") as pacientes_com_evolucao,
  sum(coalesce(de."prescribedVolume", 0)) as volume_prescrito_ml,
  sum(coalesce(de."infusedVolume", 0)) as volume_infundido_ml,
  case
    when sum(coalesce(de."prescribedVolume", 0)) > 0
      then round((sum(coalesce(de."infusedVolume", 0)) / sum(coalesce(de."prescribedVolume", 0)) * 100)::numeric, 2)
    else 0
  end as percentual_infusao
from "DailyEvolution" de
left join "Hospital" h on h.id = de."hospitalId"
where de.date::date between date '2026-05-01' and date '2026-05-31'
group by h.name, de.date::date
order by de.date::date;

-- 4. Custo estimado por formula, quando preco de faturamento estiver cadastrado.
select
  h.name as hospital,
  f.name as formula,
  f."billingUnit" as unidade_faturamento,
  f."billingPrice" as preco_unitario,
  sum(pf.volume * pf."timesPerDay") as quantidade_base_dia,
  sum(pf.volume * pf."timesPerDay" * coalesce(f."billingPrice", 0)) as custo_base_dia
from "PrescriptionFormula" pf
join "Prescription" p on p.id = pf."prescriptionId"
join "Formula" f on f.id = pf."formulaId"
left join "Hospital" h on h.id = p."hospitalId"
where p.status = 'active'
group by h.name, f.name, f."billingUnit", f."billingPrice"
order by custo_base_dia desc;

-- 5. Pacientes-dia por hospital e ala.
select
  h.name as hospital,
  coalesce(w.name, 'Sem ala') as ala,
  count(distinct de."patientId" || ':' || de.date::date) as pacientes_dia
from "DailyEvolution" de
join "Patient" p on p.id = de."patientId"
left join "Ward" w on w.id = p."wardId"
left join "Hospital" h on h.id = de."hospitalId"
where de.date::date between date '2026-05-01' and date '2026-05-31'
group by h.name, coalesce(w.name, 'Sem ala')
order by pacientes_dia desc;
