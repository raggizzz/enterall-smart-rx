# ENMeta - Sistema Inteligente de Nutrição Enteral
## Documentação das Funcionalidades de IA e Análise Avançada

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Módulos Implementados](#módulos-implementados)
3. [Funcionalidades Principais](#funcionalidades-principais)
4. [Guia de Uso](#guia-de-uso)
5. [Arquitetura Técnica](#arquitetura-técnica)
6. [APIs e Integrações](#apis-e-integrações)

---

## 🎯 Visão Geral

O ENMeta é um sistema avançado de prescrição e análise de nutrição enteral que utiliza **Inteligência Artificial**, **Machine Learning** e **Modelagem Preditiva** para apoiar nutricionistas na tomada de decisões clínicas e econômicas.

### Objetivos Principais

- ✅ Gerar recomendações automáticas personalizadas baseadas em dados clínicos
- ✅ Estimar custo-efetividade entre sistemas aberto e fechado
- ✅ Automatizar cálculos nutricionais e de custos
- ✅ Prever consumo, evolução nutricional e impacto econômico
- ✅ Integrar APIs para atualização automática de dados
- ✅ Utilizar ML para recomendações baseadas em casos históricos

---

## 🧩 Módulos Implementados

### 1. **AI Recommendation Engine** (`aiRecommendationEngine.ts`)

**Objetivo:** Gerar recomendações nutricionais personalizadas automaticamente.

**Funcionalidades:**
- Cálculo de necessidades calóricas (Harris-Benedict + fatores de estresse)
- Cálculo de necessidades proteicas baseado em condição clínica
- Seleção automática de fórmulas adequadas
- Determinação de esquema de infusão
- Recomendação de sistema (aberto/fechado)
- Geração de justificativas clínicas e alertas

**Entrada:**
```typescript
interface PatientData {
  age: number;
  weight: number;
  height: number;
  diagnosis: string;
  comorbidities: string[];
  administrationRoute: 'oral' | 'enteral' | 'parenteral';
  restrictions: string[];
  clinicalCondition: 'critical' | 'moderate' | 'stable';
  renalFunction: 'normal' | 'impaired' | 'dialysis';
  diabetic: boolean;
  stressLevel: 'low' | 'moderate' | 'high' | 'severe';
}
```

**Saída:**
```typescript
interface NutritionRecommendation {
  recommendedFormulas: FormulaRecommendation[];
  totalCalories: number;
  totalProtein: number;
  caloriesPerKg: number;
  proteinPerKg: number;
  infusionSchedule: InfusionSchedule;
  systemType: 'open' | 'closed';
  rationale: string[];
  warnings: string[];
  confidence: number;
}
```

**Exemplo de Uso:**
```typescript
import { generateNutritionRecommendation } from '@/lib/aiRecommendationEngine';

const patient = {
  age: 65,
  weight: 70,
  height: 170,
  diagnosis: 'sepsis',
  comorbidities: ['diabetes'],
  administrationRoute: 'enteral',
  restrictions: [],
  clinicalCondition: 'critical',
  renalFunction: 'normal',
  diabetic: true,
  stressLevel: 'high'
};

const recommendation = generateNutritionRecommendation(patient);
// Retorna recomendação completa com justificativas
```

---

### 2. **Cost-Effectiveness Analysis** (`costEffectivenessAnalysis.ts`)

**Objetivo:** Comparar custos entre sistemas aberto e fechado, simulando diferentes cenários.

**Funcionalidades:**
- Análise comparativa de custos (fórmulas, equipamentos, mão de obra)
- Cálculo de custos de contaminação e desperdício
- Simulação de cenários (volume, tempo, número de pacientes)
- Projeções mensais e anuais
- Cálculo de ROI e período de payback
- Ponto de equilíbrio (break-even)

**Principais Funções:**

```typescript
// Comparar sistemas
const comparison = compareSystemCosts({
  daysOfUse: 10,
  prescribedVolume: 1500,
  infusedVolume: 1500,
  numberOfPatients: 1,
  systemType: 'closed'
});

// Simular cenários
const scenarios = simulateScenarios(baseScenario);

// Calcular ROI
const roi = calculateROI('open', 'closed', scenario, implementationCost);
```

**Métricas Calculadas:**
- Custo total por sistema
- Custo por paciente/dia
- Custo por ml infundido
- Economia potencial
- Taxa de contaminação
- Taxa de desperdício

---

### 3. **Predictive Modeling** (`predictiveModeling.ts`)

**Objetivo:** Prever consumo, evolução nutricional e impacto econômico.

**Funcionalidades:**
- Predição de volume diário de fórmula
- Estimativa de evolução nutricional (peso, albumina, pré-albumina)
- Cálculo de risco de complicações
- Projeção de custos (diário, mensal, anual)
- Simulação de cenários alternativos
- Tempo estimado para atingir meta nutricional

**Modelos Preditivos:**

1. **Consumo de Fórmulas:**
   - Baseado em diagnóstico, idade, peso, via de administração
   - Ajustado por gravidade clínica e comorbidades
   - Confiança calculada automaticamente

2. **Evolução Nutricional:**
   - Predição de mudança de peso
   - Estimativa de marcadores bioquímicos
   - Risco de complicações

3. **Impacto Econômico:**
   - Custo por categoria (fórmulas, equipamentos, trabalho, complicações)
   - Projeções temporais

**Exemplo:**
```typescript
import { generatePredictionReport } from '@/lib/predictiveModeling';

const inputs = {
  diagnosis: 'sepsis',
  ageGroup: 'elderly',
  weight: 70,
  administrationRoute: 'enteral',
  lengthOfStay: 10,
  clinicalSeverity: 'high',
  comorbidityCount: 2
};

const report = generatePredictionReport(inputs);
// Retorna predições completas com cenários simulados
```

---

### 4. **Machine Learning Recommendations** (`mlRecommendations.ts`)

**Objetivo:** Utilizar aprendizado supervisionado para recomendações baseadas em casos históricos.

**Funcionalidades:**
- Algoritmo K-Nearest Neighbors (KNN)
- Busca de casos similares no histórico
- Predição ponderada por similaridade
- Recomendação de fórmulas baseada em outcomes
- Cálculo de probabilidade de sucesso
- Aprendizado contínuo (adicionar novos casos)

**Características:**
- **Feature Engineering:** Conversão de dados clínicos em features numéricas
- **Normalização:** Min-max scaling para comparação justa
- **Similaridade:** Distância Euclidiana entre casos
- **Predição:** Média ponderada dos k casos mais similares

**Exemplo:**
```typescript
import { generateMLRecommendation } from '@/lib/mlRecommendations';

const patient = {
  age: 65,
  weight: 70,
  height: 170,
  diagnosis: 'sepsis',
  comorbidities: ['diabetes'],
  administrationRoute: 'enteral'
};

const mlRec = generateMLRecommendation(patient);
// Retorna recomendação baseada em casos históricos similares
```

**Métricas de Performance:**
```typescript
const performance = evaluateModelPerformance();
// { accuracy: 0.85, precision: 0.83, recall: 0.87, totalCases: 150 }
```

---

### 5. **API Integration** (`apiIntegration.ts`)

**Objetivo:** Integrar APIs externas para atualização automática de dados.

**Funcionalidades:**
- Sincronização automática de tabelas nutricionais
- Atualização de preços e apresentações
- Cache inteligente de dados
- Validação de conexão
- Exportação/importação de dados
- Auto-sync configurável

**APIs Suportadas:**
- Fabricantes de fórmulas
- Distribuidores
- Bases institucionais
- Tabelas nutricionais

**Exemplo:**
```typescript
import { syncAllData, getNutritionalData, calculateCostPerMl } from '@/lib/apiIntegration';

// Sincronizar todos os dados
const result = await syncAllData();
console.log(`${result.itemsUpdated} itens atualizados`);

// Obter dados nutricionais
const nutritionalData = await getNutritionalData('f1');

// Calcular custo por ml
const costPerMl = await calculateCostPerMl('f1', 500);
```

**Auto-Sync:**
```typescript
// Configurar sincronização automática a cada 60 minutos
const cleanup = setupAutoSync(60);

// Parar sincronização
cleanup();
```

---

### 6. **Automated Calculations** (`automatedCalculations.ts`)

**Objetivo:** Automatizar todos os cálculos nutricionais e de custos.

**Funcionalidades:**
- Cálculo de macronutrientes e micronutrientes
- Distribuição de volume e taxa de infusão
- Cálculos de custos detalhados
- Métricas por paciente e por ala
- Cálculo de IMC e peso ideal
- Balanço nitrogenado
- Necessidades hídricas
- Adequação nutricional

**Principais Funções:**

```typescript
// Cálculos nutricionais
const nutrition = calculateNutrition(formulaComposition, volume);

// Cálculos de volume
const volumeCalc = calculateVolume(totalVolume, infusionTimes, 'intermittent');

// Cálculos de custo
const cost = calculateCost(volume, costPerMl, equipmentCost, laborCost, days);

// Métricas agregadas por ala
const wardMetrics = calculateWardMetrics('UTI-Adulto', patients);

// Relatório completo
const report = generateCalculationReport(patientData, prescription, costs);
```

**Validação Automática:**
```typescript
const validation = validateCalculations(calculations);
if (!validation.isValid) {
  console.error('Erros:', validation.errors);
}
if (validation.warnings.length > 0) {
  console.warn('Avisos:', validation.warnings);
}
```

---

## 🚀 Funcionalidades Principais

### 1. Prescrição Inteligente

**Tela:** `/prescription-new`

**Recursos:**
- Seleção de paciente
- Escolha de vias alimentares (Oral, Suplementação, Enteral, Parenteral)
- Sistema aberto/fechado
- Múltiplas fórmulas com horários diferentes
- Água de diluição (sistema aberto)
- Cálculo automático de frascos para faturamento
- Cálculos nutricionais em tempo real

**Regras de Faturamento:**
- Volume ≤ 100ml → 1 frasco de 100ml
- Volume ≤ 300ml → 1 frasco de 300ml
- Volume ≤ 500ml → 1 frasco de 500ml
- Volume > 500ml → Múltiplos frascos

### 2. Recomendações com IA

**Tela:** `/ai-recommendations`

**Recursos:**
- Entrada de dados clínicos e antropométricos
- Geração automática de recomendações
- Justificativas clínicas detalhadas
- Alertas e precauções
- Comparação com ML (casos históricos)
- Nível de confiança das recomendações

### 3. Dashboard Inteligente

**Tela:** `/dashboard`

**Recursos:**
- Seleção de ala hospitalar
- Busca de pacientes (nome, data nascimento, prontuário)
- Cadastro de novos pacientes
- Mapa visual do setor
- Ícones de vias alimentares
- Estatísticas em tempo real

---

## 📖 Guia de Uso

### Fluxo de Trabalho Recomendado

1. **Acesso ao Sistema**
   - Login → Dashboard

2. **Seleção de Ala**
   - Escolher setor do hospital
   - Visualizar mapa com pacientes

3. **Prescrição Nutricional**
   - Clicar no paciente
   - Ou usar "Nova Prescrição"
   - Preencher dados clínicos
   - Gerar recomendações com IA (opcional)
   - Configurar fórmulas e horários
   - Salvar prescrição

4. **Análise e Otimização**
   - Acessar "Recomendações com IA"
   - Comparar cenários de custo
   - Visualizar predições
   - Ajustar conforme necessário

### Melhores Práticas

✅ **Sempre preencher dados completos do paciente**
- Peso, altura, idade, diagnóstico
- Comorbidades e restrições
- Função renal e hepática

✅ **Revisar recomendações da IA**
- As recomendações são sugestões
- Nutricionista mantém autonomia
- Ajustar conforme julgamento clínico

✅ **Monitorar custos regularmente**
- Comparar sistemas aberto vs fechado
- Simular cenários alternativos
- Avaliar ROI de mudanças

✅ **Atualizar dados periodicamente**
- Sincronizar APIs
- Adicionar novos casos ao ML
- Revisar tabelas nutricionais

---

## 🏗️ Arquitetura Técnica

### Stack Tecnológico

- **Frontend:** React 18 + TypeScript
- **UI:** shadcn/ui + Tailwind CSS
- **Roteamento:** React Router v6
- **Estado:** React Hooks
- **Validação:** Zod
- **Ícones:** Lucide React

### Estrutura de Arquivos

```
src/
├── lib/
│   ├── aiRecommendationEngine.ts      # Motor de recomendações IA
│   ├── costEffectivenessAnalysis.ts   # Análise de custos
│   ├── predictiveModeling.ts          # Modelagem preditiva
│   ├── mlRecommendations.ts           # Machine Learning
│   ├── apiIntegration.ts              # Integração de APIs
│   └── automatedCalculations.ts       # Cálculos automatizados
├── pages/
│   ├── Dashboard.tsx                  # Dashboard principal
│   ├── PrescriptionNew.tsx            # Prescrição avançada
│   └── AIRecommendations.tsx          # Recomendações IA
└── components/
    └── ui/                            # Componentes shadcn/ui
```

### Fluxo de Dados

```
Entrada de Dados (Usuário)
    ↓
Validação e Processamento
    ↓
┌─────────────────────────────────┐
│  Módulos de IA e Análise        │
│  - AI Engine                    │
│  - ML Recommendations           │
│  - Predictive Models            │
│  - Cost Analysis                │
└─────────────────────────────────┘
    ↓
Cálculos Automatizados
    ↓
Apresentação de Resultados
    ↓
Decisão do Nutricionista
```

---

## 🔌 APIs e Integrações

### Endpoints Configurados

```typescript
const API_ENDPOINTS = {
  nutritionalData: 'https://api.nutrition-database.com/v1/formulas',
  pricingData: 'https://api.hospital-suppliers.com/v1/pricing',
  manufacturerData: 'https://api.manufacturers.com/v1/products',
  institutionalData: 'https://api.hospital-internal.com/v1/inventory',
};
```

### Dados Sincronizados

1. **Tabelas Nutricionais**
   - Composição por 100ml
   - Macronutrientes e micronutrientes
   - Fabricante e tipo

2. **Dados de Preços**
   - Preço por apresentação
   - Fornecedores
   - Códigos internos
   - Validade

### Configuração de Sync

```typescript
// Sincronização manual
const result = await syncAllData();

// Sincronização automática
setupAutoSync(60); // A cada 60 minutos

// Verificar necessidade de atualização
if (needsRefresh(60)) {
  await syncAllData();
}
```

---

## 📊 Métricas e KPIs

### Métricas Clínicas
- Adequação calórica (% da meta)
- Adequação proteica (% da meta)
- Taxa de sucesso das prescrições
- Tempo para atingir meta nutricional
- Taxa de complicações

### Métricas Econômicas
- Custo por paciente/dia
- Custo por ml infundido
- Economia com sistema fechado
- ROI de mudanças de sistema
- Redução de desperdício

### Métricas de Qualidade
- Confiança das recomendações IA
- Acurácia do modelo ML
- Taxa de contaminação
- Satisfação do usuário

---

## 🔒 Segurança e Privacidade

- ✅ Dados de pacientes anonimizados para ML
- ✅ Validação de entrada de dados
- ✅ Logs de auditoria
- ✅ Conformidade com LGPD
- ✅ Backup automático de dados

---

## 🎓 Treinamento e Suporte

### Recursos Disponíveis
- Documentação técnica completa
- Tutoriais em vídeo
- FAQ e troubleshooting
- Suporte técnico

### Contato
- Email: suporte@enmeta.com.br
- Telefone: (11) 1234-5678
- Chat online: disponível 24/7

---

## 📈 Roadmap Futuro

### Próximas Funcionalidades
- [ ] Deep Learning para predições mais precisas
- [ ] Integração com prontuário eletrônico
- [ ] App mobile para nutricionistas
- [ ] Dashboard executivo para gestores
- [ ] Relatórios automáticos em PDF
- [ ] Alertas inteligentes por WhatsApp/SMS
- [ ] Análise de tendências e benchmarking

---

## 📝 Changelog

### v2.0.0 (2024)
- ✨ Sistema de recomendações com IA
- ✨ Análise de custo-efetividade
- ✨ Modelagem preditiva
- ✨ Machine Learning
- ✨ Integração de APIs
- ✨ Cálculos automatizados
- 🎨 Nova interface de prescrição
- 🎨 Dashboard aprimorado com mapa de setor

### v1.0.0 (2023)
- 🎉 Lançamento inicial
- ✅ Prescrição básica
- ✅ Cadastro de pacientes
- ✅ Cálculos manuais

---

**Desenvolvido com ❤️ para melhorar a nutrição hospitalar no Brasil**
