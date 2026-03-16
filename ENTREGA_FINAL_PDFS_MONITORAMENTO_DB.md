# Entrega final: PDFs, monitoramento e banco

## 1. O que foi fechado dos PDFs e Excel

### Calculos

Implementado e revisado no fluxo de prescricao:

- IMC = peso atual / estatura²
- peso ideal quando IMC > 30
- resumo com peso atual e peso ideal
- VET
- kcal/kg
- proteina total e g/kg
- carboidratos e lipideos pela logica do valor energetico
- fibras calculadas por quantidade prescrita por dia
- agua livre total
- sodio, potassio, calcio e fosforo
- residuos reciclaveis por formula/insumo
- mesma base de calculo aplicada para formulas, suplementos e modulos
- NP com TIG em mg/kg/min

### Cadastro de formulas, modulos e insumos

Coberto no app:

- codigo
- fabricante
- nome comercial
- tipo
- apresentacao
- embalagem padrao
- unidade de faturamento
- fator de conversao por unidade
- valor por unidade de faturamento
- densidade calorica
- classificacao
- complexidade polimerica/oligomerica
- macronutrientes
- percentuais de macros
- fontes de proteina, carboidrato, lipidio e fibra
- fibras
- sodio, potassio, calcio e fosforo
- agua livre
- outras caracteristicas
- residuos de plastico, papel, metal e vidro
- insumos com frasco/equipo/outros
- categoria de espessante

### Cadastro de profissionais

Coberto no app:

- gestor geral
- gestor local
- nutricionista
- tecnico
- nome completo
- matricula
- CPF
- CRN
- CPE para gestor
- unidade gestora
- senha numerica de 8 digitos
- autenticacao real no backend

### Etiquetas

Atualizado:

- paciente
- leito
- data de nascimento
- formula
- volume total
- velocidade de infusao
- via
- validade
- conservacao
- RT
- lote/controle
- distincao melhor entre sistema aberto e fechado
- sistema fechado usando melhor a data da prescricao
- composicao mais rica

### Requisicao/faturamento

Atualizado:

- mapa horizontal parecido com o modelo
- agua em linha separada
- modulos em linha separada
- prontuario por paciente
- via
- volume/etapa
- velocidade de infusao
- horarios
- observacoes
- consolidado com codigo, item, unidade, quantidade, preco e subtotal
- total geral
- assinaturas
- cancelamento tecnico

### Relatorios gerenciais

Coberto:

- historico assistencial
- consumo por produto
- comparacao por produto
- residuos por produto
- media por paciente
- paciente-dia
- custo total
- custo por produto-dia
- subtotais por categoria
- exportacao XML

## 2. O que foi criado no monitoramento

### Backend

Novos endpoints:

- `/health`
- `/health/live`
- `/health/ready`
- `/metrics`

Metricas novas:

- requisicoes HTTP por rota/status
- latencia HTTP
- banco pronto ou indisponivel
- conflitos de versao
- replays de idempotencia

### Prometheus

Agora faz scrape de:

- `prometheus`
- `postgres-exporter`
- `enmeta-backend`

Tambem entrou:

- regras de alerta basicas em `infra/postgres/prometheus/alerts.yml`

### Grafana

Dashboards provisionados automaticamente:

- `ENMeta - Backend`
- `ENMeta - PostgreSQL`

## 3. O que foi endurecido no banco

- PostgreSQL mantido como banco principal
- indices adicionados para consultas frequentes de paciente, formula, modulo, insumo, profissional e evolucao
- readiness real com teste no banco
- observabilidade do backend para operacao 24h
- scripts de backup e restore
- script rapido de checagem da stack

Arquivos operacionais:

- `infra/postgres/scripts/backup.ps1`
- `infra/postgres/scripts/restore.ps1`
- `infra/postgres/scripts/check-stack.ps1`

## 4. Se o calculo esta normal

Sim: o calculo principal esta alinhado com o PDF.

Em especial:

- VET segue a logica de velocidade x densidade x tempo para a enteral por bomba
- macros usam o raciocinio energetico esperado
- proteina/carbo usam 4 kcal/g
- lipidio usa 9 kcal/g
- fibras nao entram como caloria
- se IMC > 30 o app exibe IMC e peso ideal, e o resumo clinico ja contempla esse raciocinio
- NP calcula VET automatico e TIG

Observacao honesta:

- existem cenarios clinicos em que a conduta nutricional real pode exigir regra institucional propria; entao o app esta aderente ao PDF e ao fluxo pedido, mas a validacao clinica final continua sendo da equipe.

## 5. Prints gerados

Capturas salvas em:

- `docs/screenshots/dashboard.png`
- `docs/screenshots/settings-perfis.png`
- `docs/screenshots/professionals.png`
- `docs/screenshots/billing.png`
- `docs/screenshots/grafana-backend.png`
- `docs/screenshots/grafana-postgres.png`

## 6. Arquivos principais alterados nesta etapa

### App

- `src/components/billing/RequisitionDocument.tsx`
- `src/pages/Billing.tsx`
- `src/utils/requisitionGenerator.ts`
- `src/types/requisition.ts`
- `src/pages/Professionals.tsx`
- `src/App.tsx`
- `MATRIZ_PERFIS_APP.md`

### Backend

- `server/src/index.ts`
- `server/src/lib/metrics.ts`
- `server/src/lib/request-guards.ts`
- `server/src/routes/patients.ts`
- `server/src/routes/prescriptions.ts`
- `server/src/routes/formulas.ts`
- `server/src/routes/modules.ts`
- `server/src/routes/supplies.ts`
- `server/src/routes/professionals.ts`
- `server/src/routes/evolutions.ts`
- `server/src/routes/hospitals.ts`
- `server/src/routes/settings.ts`
- `server/src/routes/wards.ts`
- `server/prisma/schema.prisma`

### Infra

- `infra/postgres/docker-compose.yml`
- `infra/postgres/prometheus/prometheus.yml`
- `infra/postgres/prometheus/alerts.yml`
- `infra/postgres/grafana/provisioning/datasources/prometheus.yml`
- `infra/postgres/grafana/provisioning/dashboards/dashboards.yml`
- `infra/postgres/grafana/dashboards/enmeta-backend-overview.json`
- `infra/postgres/grafana/dashboards/enmeta-postgres-overview.json`
- `infra/postgres/scripts/backup.ps1`
- `infra/postgres/scripts/restore.ps1`
- `infra/postgres/scripts/check-stack.ps1`
- `infra/postgres/README.md`
- `docs/GUIA_OPERACIONAL_PWA_POSTGRES.md`
