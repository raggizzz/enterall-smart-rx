import { useMemo, useState, useEffect } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, Clock, Calculator } from "lucide-react";
import { useAppTools } from "@/hooks/useDatabase";
import { useFormulas, useModules } from "@/hooks/useDatabase";

// --- Types for Predictive Equations ---
type EquationType = "weight" | "height";
type Sex = "male" | "female" | "both";
type Race = "white" | "black" | "both";

interface PredictiveEquation {
  id: string;
  name: string;
  type: EquationType;
  sex: Sex;
  race: Race;
  minAge: number;
  maxAge: number;
  coefKnee: number;
  coefArm: number;
  coefAge: number;
  constant: number;
  isActive: boolean;
}

const DEFAULT_EQUATIONS: PredictiveEquation[] = [
  // Chumlea - White Male
  { id: "chumlea_w_m_h", name: "Chumlea (Homem Branco) - Altura", type: "height", sex: "male", race: "white", minAge: 18, maxAge: 120, coefKnee: 1.88, coefArm: 0, coefAge: 0, constant: 71.85, isActive: true },
  { id: "chumlea_w_m_w", name: "Chumlea (Homem Branco) - Peso", type: "weight", sex: "male", race: "white", minAge: 18, maxAge: 120, coefKnee: 1.19, coefArm: 3.21, coefAge: 0, constant: -86.82, isActive: true },
  // Chumlea - Black Male
  { id: "chumlea_b_m_h", name: "Chumlea (Homem Negro) - Altura", type: "height", sex: "male", race: "black", minAge: 18, maxAge: 120, coefKnee: 1.79, coefArm: 0, coefAge: 0, constant: 73.42, isActive: true },
  { id: "chumlea_b_m_w", name: "Chumlea (Homem Negro) - Peso", type: "weight", sex: "male", race: "black", minAge: 18, maxAge: 120, coefKnee: 1.09, coefArm: 3.14, coefAge: 0, constant: -83.72, isActive: true },
  // Chumlea - White Female
  { id: "chumlea_w_f_h", name: "Chumlea (Mulher Branca) - Altura", type: "height", sex: "female", race: "white", minAge: 18, maxAge: 120, coefKnee: 1.87, coefArm: 0, coefAge: -0.06, constant: 70.25, isActive: true },
  { id: "chumlea_w_f_w", name: "Chumlea (Mulher Branca) - Peso", type: "weight", sex: "female", race: "white", minAge: 18, maxAge: 120, coefKnee: 1.01, coefArm: 2.81, coefAge: 0, constant: -66.04, isActive: true },
  // Chumlea - Black Female
  { id: "chumlea_b_f_h", name: "Chumlea (Mulher Negra) - Altura", type: "height", sex: "female", race: "black", minAge: 18, maxAge: 120, coefKnee: 1.86, coefArm: 0, coefAge: -0.06, constant: 68.1, isActive: true },
  { id: "chumlea_b_f_w", name: "Chumlea (Mulher Negra) - Peso", type: "weight", sex: "female", race: "black", minAge: 18, maxAge: 120, coefKnee: 1.24, coefArm: 2.97, coefAge: 0, constant: -82.48, isActive: true },
];

const numberOrZero = (value: string | number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// --- Helper Data ---
const TOOLS_FALLBACK = [
  { code: "PESO_ALTURA", name: "Estimativa de peso e altura", category: "antropometria" },
  { code: "GIDS", name: "Escore GIDS", category: "triagem" },
  { code: "DVA_NOR", name: "Calculadora de Noradrenalina", category: "crítico" },
  { code: "DVA_VASO", name: "Calculadora de Vasopressina", category: "crítico" },
  { code: "NRS", name: "Triagem NRS 2002", category: "triagem" },
  { code: "BALANCO_N", name: "Balanço nitrogenado", category: "metabólico" },
  { code: "GASTO_ENERGETICO", name: "Estimativa de gasto energético", category: "metabólico" },
  { code: "GLIM", name: "Diagnóstico GLIM", category: "triagem" },
];

const LINKS_FALLBACK = [
  { name: "Diretrizes SBNPE", link: "https://www.sbnpe.org.br/diretrizes" },
  { name: "Guidelines ESPEN", link: "https://www.espen.org/guidelines-home/espen-guidelines" },
  { name: "Guidelines ASPEN", link: "https://nutritioncare.org/clinical-resources/guidelines-standards/" },
  { name: "Formulário MAN", link: "https://www.mna-elderly.com/sites/default/files/2024-10/MNA_AU2.0_%20por-BR_nonMapi.pdf" },
  { name: "GMFCS em português", link: "https://canchild.ca/wp-content/uploads/2025/03/GMFCS-ER_Translation-Portuguese2.pdf" },
  { name: "Curvas OMS", link: "https://www.sbp.com.br/departamentos/endocrinologia/graficos-de-crescimento/" },
  { name: "Curvas para paralisia cerebral", link: "https://www.lifeexpectancy.org/Articles/NewGrowthCharts.shtml" },
  { name: "Global GLIM Leadership", link: "https://www.glim-initiative.org/" },
];

// --- GIDS Types ---
type GidsMildKey = "absentBowelSounds" | "vomiting" | "residualVolume" | "ileus" | "distension" | "mildDiarrhea" | "giBleedNoTransfusion" | "pia12to20";
type GidsSevereKey = "severeDiarrhea" | "giBleedWithTransfusion" | "prokinetics" | "persistentIleus" | "persistentDistension" | "piaAbove20";
type GidsThreateningKey = "hemorrhagicShock" | "mesentericIschemia" | "abdominalCompartment";

const GIDS_MILD_OPTIONS: Array<{ key: GidsMildKey; label: string }> = [
  { key: "absentBowelSounds", label: "Ausência de ruídos intestinais" },
  { key: "vomiting", label: "Vômitos" },
  { key: "residualVolume", label: "Aumento do volume residual gástrico" },
  { key: "ileus", label: "Íleo paralítico" },
  { key: "distension", label: "Distensão abdominal" },
  { key: "mildDiarrhea", label: "Diarreia leve" },
  { key: "giBleedNoTransfusion", label: "Sangramento gastrointestinal sem transfusão" },
  { key: "pia12to20", label: "PIA entre 12 e 20 mmHg" },
];
const GIDS_SEVERE_OPTIONS: Array<{ key: GidsSevereKey; label: string }> = [
  { key: "severeDiarrhea", label: "Diarreia grave" },
  { key: "giBleedWithTransfusion", label: "Sangramento gastrointestinal com transfusão" },
  { key: "prokinetics", label: "Uso de procinéticos para tolerância" },
  { key: "piaAbove20", label: "PIA acima de 20 mmHg" },
];
const GIDS_THREAT_OPTIONS: Array<{ key: GidsThreateningKey; label: string }> = [
  { key: "hemorrhagicShock", label: "Choque hemorrágico" },
  { key: "mesentericIschemia", label: "Isquemia mesentérica" },
  { key: "abdominalCompartment", label: "Síndrome compartimental abdominal" },
];

const GIDS_SEVERE_DISPLAY_OPTIONS: Array<{ key: GidsSevereKey; label: string }> = [
  ...GIDS_SEVERE_OPTIONS.map((option) => ({
    ...option,
    label: option.key === "prokinetics" ? "Uso de procinéticos para manter tolerância" : option.label,
  })),
  { key: "persistentIleus", label: "Íleo paralítico/dinâmico persistente" },
  { key: "persistentDistension", label: "Distensão abdominal persistente ou em piora" },
];

const GIDS_RESULT_COPY: Record<number, { title: string; description: string }> = {
  0: {
    title: "GIDS 0 - Sem risco imediato",
    description: "Sem sintomas, ou apenas um sintoma leve com ingestão oral mantida.",
  },
  1: {
    title: "GIDS 1 - Risco aumentado",
    description: "Acúmulo inicial de sinais gastrointestinais ou ausência de ingestão oral.",
  },
  2: {
    title: "GIDS 2 - Disfuncao gastrointestinal",
    description: "Três ou mais critérios leves/de risco ou até dois critérios maiores.",
  },
  3: {
    title: "GIDS 3 - Falencia gastrointestinal",
    description: "Três ou mais critérios maiores, sugerindo perda importante de função.",
  },
  4: {
    title: "GIDS 4 - Ameaça à vida",
    description: "Há critério gastrointestinal imediatamente ameaçador à vida.",
  },
};

const NRS_NUTRITION_OPTIONS = [
  {
    value: "0",
    title: "0 - Ausente",
    description: "Estado nutricional preservado.",
  },
  {
    value: "1",
    title: "1 - Leve",
    description: "Perda de peso > 5% em 3 meses ou ingestão entre 50% e 75% da necessidade na última semana.",
  },
  {
    value: "2",
    title: "2 - Moderado",
    description: "Perda de peso > 5% em 2 meses, IMC entre 18,5 e 20,5 com condição geral comprometida, ou ingestão entre 25% e 60%.",
  },
  {
    value: "3",
    title: "3 - Grave",
    description: "Perda de peso > 5% em 1 mês ou > 15% em 3 meses, IMC < 18,5 com condição geral comprometida, ou ingestão entre 0% e 25%.",
  },
] as const;

const NRS_DISEASE_OPTIONS = [
  {
    value: "0",
    title: "0 - Ausente",
    description: "Necessidades nutricionais habituais, sem aumento relevante de demanda.",
  },
  {
    value: "1",
    title: "1 - Leve",
    description: "Fratura de quadril ou doença crônica com complicação aguda, como cirrose, DPOC, hemodiálise, diabetes ou oncologia.",
  },
  {
    value: "2",
    title: "2 - Moderado",
    description: "Cirurgia abdominal de grande porte, AVC, pneumonia grave ou malignidade hematológica.",
  },
  {
    value: "3",
    title: "3 - Grave",
    description: "TCE, transplante de medula ou paciente crítico em UTI com APACHE > 10.",
  },
] as const;

const Tools = () => {
  const { tools } = useAppTools();
  const { formulas } = useFormulas();
  const { modules } = useModules();
  const [catalogSearch, setCatalogSearch] = useState("");

  // --- PREDICTIVE EQUATIONS STATE ---
  const [equations] = useState<PredictiveEquation[]>(() => {
    const saved = localStorage.getItem('predictive_equations');
    const source = saved ? JSON.parse(saved) as PredictiveEquation[] : DEFAULT_EQUATIONS;
    return source.map((equation) => equation.id.startsWith("chumlea_") ? { ...equation, minAge: Math.min(equation.minAge, 18) } : equation);
  });

  // Form inputs for Prediction
  const [predSex, setPredSex] = useState<Sex>("male");
  const [predRace, setPredRace] = useState<Race>("white");
  const [predAge, setPredAge] = useState("65");
  const [predKnee, setPredKnee] = useState("");
  const [predArm, setPredArm] = useState("");

  const predictionResult = useMemo(() => {
    const age = numberOrZero(predAge);
    const knee = numberOrZero(predKnee);
    const arm = numberOrZero(predArm);

    const hasAge = predAge !== "" && age > 0;
    const hasKnee = predKnee !== "" && knee > 0;
    const hasArm = predArm !== "" && arm > 0;

    // Find best match for HEIGHT equation
    const heightEq = equations.find(e =>
      e.isActive &&
      e.type === 'height' &&
      (e.sex === 'both' || e.sex === predSex) &&
      (e.race === 'both' || e.race === predRace) &&
      age >= e.minAge && age <= e.maxAge
    );

    // Find best match for WEIGHT equation
    const weightEq = equations.find(e =>
      e.isActive &&
      e.type === 'weight' &&
      (e.sex === 'both' || e.sex === predSex) &&
      (e.race === 'both' || e.race === predRace) &&
      age >= e.minAge && age <= e.maxAge
    );

    // --- HEIGHT: requires sex, age, race, knee (all filled) ---
    let estHeight = 0;
    let heightMissingFields = false;
    let heightInvalidError = false;

    if (!hasAge || !hasKnee) {
      heightMissingFields = true;
    } else if (heightEq) {
      const rawHeight = heightEq.constant + (heightEq.coefKnee * knee) + (heightEq.coefArm * arm) + (heightEq.coefAge * age);
      if (rawHeight <= 0) {
        heightInvalidError = true;
      } else {
        estHeight = rawHeight;
      }
    }

    // --- WEIGHT: requires sex, age, race, knee, arm (all filled) ---
    let estWeight = 0;
    let weightMissingArm = false;
    let weightMissingFields = false;
    let weightNegativeError = false;

    if (!hasAge || !hasKnee) {
      weightMissingFields = true;
    } else if (!hasArm) {
      weightMissingArm = true;
    } else if (weightEq) {
      const rawWeight = weightEq.constant + (weightEq.coefKnee * knee) + (weightEq.coefArm * arm) + (weightEq.coefAge * age);
      if (rawWeight <= 0) {
        weightNegativeError = true;
      } else {
        estWeight = rawWeight;
      }
    }

    return {
      estHeightCm: Number(estHeight.toFixed(2)),
      estHeightM: Number((estHeight / 100).toFixed(2)),
      estWeightKg: Number(estWeight.toFixed(2)),
      heightEqName: heightEq?.name || "Nenhuma equação encontrada",
      weightEqName: weightEq?.name || "Nenhuma equação encontrada",
      heightMissingFields,
      heightInvalidError,
      weightMissingArm,
      weightMissingFields,
      weightNegativeError,
    };
  }, [equations, predSex, predRace, predAge, predKnee, predArm]);

  // --- GLIM STATE (Manual) ---
  const [glimWeightLoss, setGlimWeightLoss] = useState<"none" | "moderate" | "severe">("none");
  const [glimMuscleLoss, setGlimMuscleLoss] = useState<"none" | "moderate" | "severe">("none");
  const [glimBmi, setGlimBmi] = useState<"none" | "moderate" | "severe">("none");
  const [glimReducedIntake, setGlimReducedIntake] = useState(false);
  const [glimInflammation, setGlimInflammation] = useState(false);
  const [glimDisease, setGlimDisease] = useState("cronica_com_inflamacao");

  const glimResult = useMemo(() => {
    // Diagnosis Logic based on manual inputs
    // At least 1 Phenotypic (Weight loss, BMI, Muscle) AND 1 Etiologic (Intake, Inflammation)
    const phenoPositive = glimWeightLoss !== "none" || glimBmi !== "none" || glimMuscleLoss !== "none";
    const etioPositive = glimReducedIntake || glimInflammation;

    let diagnosis = "Sem diagnóstico de desnutrição (GLIM)";
    let severity = "";

    if (phenoPositive && etioPositive) {
      // Determine severity based on PHENOTYPIC
      const isSevere = glimWeightLoss === "severe" || glimBmi === "severe" || glimMuscleLoss === "severe";
      severity = isSevere ? "Desnutrição Grave" : "Desnutrição Moderada";

      const diseaseMap: Record<string, string> = {
        cronica_com_inflamacao: "relacionada a doença crônica com inflamação",
        cronica_minima: "relacionada a doença crônica com inflamação mínima",
        aguda_grave: "relacionada a doença aguda ou injúria com inflamação grave",
        social_ambiental: "relacionada a circunstâncias sociais ou ambientais",
      };
      diagnosis = `${severity} ${diseaseMap[glimDisease] || ""}`;
    }

    return diagnosis;
  }, [glimWeightLoss, glimMuscleLoss, glimBmi, glimReducedIntake, glimInflammation, glimDisease]);


  // --- GIDS STATE ---
  const [gidsOralDiet, setGidsOralDiet] = useState(true);
  const [gidsMild, setGidsMild] = useState<Record<GidsMildKey, boolean>>({
    absentBowelSounds: false, vomiting: false, residualVolume: false, ileus: false,
    distension: false, mildDiarrhea: false, giBleedNoTransfusion: false, pia12to20: false,
  });
  const [gidsSevere, setGidsSevere] = useState<Record<GidsSevereKey, boolean>>({
    severeDiarrhea: false,
    giBleedWithTransfusion: false,
    prokinetics: false,
    persistentIleus: false,
    persistentDistension: false,
    piaAbove20: false,
  });
  const [gidsThreatening, setGidsThreatening] = useState<Record<GidsThreateningKey, boolean>>({
    hemorrhagicShock: false, mesentericIschemia: false, abdominalCompartment: false,
  });

  const gidsResult = useMemo(() => {
    const mildCount = Object.values(gidsMild).filter(Boolean).length;
    const scoreOneFeatureCount = mildCount + (gidsOralDiet ? 0 : 1);
    const severeCount = Object.values(gidsSevere).filter(Boolean).length;
    const threateningCount = Object.values(gidsThreatening).filter(Boolean).length;
    let score = 0;

    if (threateningCount > 0) score = 4;
    else if (severeCount >= 3) score = 3;
    else if (scoreOneFeatureCount >= 3 || severeCount >= 1) score = 2;
    else if (!gidsOralDiet || scoreOneFeatureCount >= 2) score = 1;

    const rationale: string[] = [];
    if (!gidsOralDiet) rationale.push("Sem ingestão oral mantida.");
    if (mildCount > 0) rationale.push(`${mildCount} critério(s) leves/baixo grau selecionados.`);
    if (severeCount > 0) rationale.push(`${severeCount} critério(s) maiores selecionados.`);
    if (threateningCount > 0) rationale.push(`${threateningCount} critério(s) ameaçadores à vida selecionados.`);
    if (rationale.length === 0) rationale.push("Nenhum critério gastrointestinal selecionado.");

    return {
      score,
      interpretation: GIDS_RESULT_COPY[score].title,
      description: GIDS_RESULT_COPY[score].description,
      mildCount,
      scoreOneFeatureCount,
      severeCount,
      threateningCount,
      rationale,
    };
  }, [gidsMild, gidsOralDiet, gidsSevere, gidsThreatening]);

  // --- DVA STATE ---
  const [dvaWeight, setDvaWeight] = useState("50");
  const [norRate, setNorRate] = useState("10");
  const [norDilution, setNorDilution] = useState("250");
  const [norAmpoules, setNorAmpoules] = useState("5");
  const [vasoRate, setVasoRate] = useState("2");
  const [vasoDilution, setVasoDilution] = useState("100");
  const [vasoAmpoules, setVasoAmpoules] = useState("2");

  const dvaResult = useMemo(() => {
    const weight = numberOrZero(dvaWeight);
    const norDose = weight > 0 ? ((numberOrZero(norAmpoules) * 4 * 1000) / numberOrZero(norDilution)) * (numberOrZero(norRate) / 60) / weight : 0;
    const vasoDose = ((numberOrZero(vasoAmpoules) * 20) / numberOrZero(vasoDilution)) * (numberOrZero(vasoRate) / 60);
    return {
      norDose: Number(norDose.toFixed(2)),
      vasoDose: Number(vasoDose.toFixed(2)),
    };
  }, [dvaWeight, norAmpoules, norDilution, norRate, vasoAmpoules, vasoDilution, vasoRate]);


  // --- NRS STATE ---
  const [nrsQ1, setNrsQ1] = useState(false);
  const [nrsQ2, setNrsQ2] = useState(false);
  const [nrsQ3, setNrsQ3] = useState(false);
  const [nrsQ4, setNrsQ4] = useState(false);
  const [nrsAge, setNrsAge] = useState("65");
  const [nrsNutritionScore, setNrsNutritionScore] = useState("0");
  const [nrsDiseaseScore, setNrsDiseaseScore] = useState("0");

  const nrsResult = useMemo(() => {
    const prescreenPositive = nrsQ1 || nrsQ2 || nrsQ3 || nrsQ4;
    const nutritionOption = NRS_NUTRITION_OPTIONS.find((option) => option.value === nrsNutritionScore) ?? NRS_NUTRITION_OPTIONS[0];
    const diseaseOption = NRS_DISEASE_OPTIONS.find((option) => option.value === nrsDiseaseScore) ?? NRS_DISEASE_OPTIONS[0];
    const ageScore = numberOrZero(nrsAge) >= 70 ? 1 : 0;
    const total = numberOrZero(nrsNutritionScore) + numberOrZero(nrsDiseaseScore) + ageScore;

    if (!prescreenPositive) {
      return {
        score: 0,
        message: "Sem risco nutricional pela triagem inicial.",
        needsFinalScreening: false,
        ageScore,
        nutritionOption,
        diseaseOption,
        recommendation: "Se todas as respostas forem negativas, repetir a triagem semanalmente.",
      };
    }

    return {
      score: total,
      message: total >= 3 ? "Risco nutricional identificado." : "Acompanhar e repetir triagem semanalmente.",
      needsFinalScreening: true,
      ageScore,
      nutritionOption,
      diseaseOption,
      recommendation: total >= 3
        ? "Escore >= 3: indicar plano de cuidado nutricional."
        : "Escore < 3: manter vigilância e repetir a triagem semanalmente.",
    };
  }, [nrsQ1, nrsQ2, nrsQ3, nrsQ4, nrsAge, nrsNutritionScore, nrsDiseaseScore]);

  const toolsCatalog = tools.length > 0 ? tools : TOOLS_FALLBACK;
  const linksToShow = tools.filter(t => t.link).length > 0 ? tools.filter(t => t.link) : LINKS_FALLBACK;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/35 to-background pb-20">
      <Header />
      <div className="container px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ferramentas Clínicas</h1>
          <p className="text-muted-foreground">Calculadoras e utilidades para avaliação nutricional.</p>
        </div>

        <Tabs defaultValue="peso_altura" className="space-y-4">
          <TabsList className="bg-card border w-full justify-start overflow-x-auto flex-wrap">
            <TabsTrigger value="peso_altura">Peso e Altura</TabsTrigger>
            <TabsTrigger value="glim">GLIM</TabsTrigger>
            <TabsTrigger value="gids">GIDS</TabsTrigger>
            <TabsTrigger value="dva">Drogas Vasoativas</TabsTrigger>
            <TabsTrigger value="nrs">NRS 2002</TabsTrigger>
            <TabsTrigger value="catalogo_produtos">Catálogo de Produtos</TabsTrigger>
            <TabsTrigger value="balanco_n">Balanço Nitrogenado</TabsTrigger>
            <TabsTrigger value="gasto_energetico">Gasto Energético</TabsTrigger>
            <TabsTrigger value="catalogo">Links e Ferramentas</TabsTrigger>
          </TabsList>

          {/* === GLIM TAB === */}
          <TabsContent value="glim" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Diagnóstico Nutricional (GLIM)</CardTitle>
                <CardDescription>Critérios fenotípicos e etiológicos para diagnóstico de desnutrição.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-1">Domínio Fenotípico</h3>

                  <div className="space-y-1">
                    <Label>Perda de Peso Involuntária</Label>
                    <Select value={glimWeightLoss} onValueChange={(v: any) => setGlimWeightLoss(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ausente</SelectItem>
                        <SelectItem value="moderate">Moderada (&gt;5% em 6m ou 5-10% &gt;6m)</SelectItem>
                        <SelectItem value="severe">Grave (&gt;10% em 6m ou &gt;20% &gt;6m)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Baixo IMC</Label>
                    <Select value={glimBmi} onValueChange={(v: any) => setGlimBmi(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Adequado</SelectItem>
                        <SelectItem value="moderate">Moderado (&lt;20 ou &lt;22 para &gt;70 anos)</SelectItem>
                        <SelectItem value="severe">Grave (&lt;18.5 ou &lt;20 para &gt;70 anos)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Redução da Massa Muscular</Label>
                    <Select value={glimMuscleLoss} onValueChange={(v: any) => setGlimMuscleLoss(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ausente</SelectItem>
                        <SelectItem value="moderate">Moderada (Déficit leve por método validado)</SelectItem>
                        <SelectItem value="severe">Grave (Déficit grave por método validado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-1">Domínio Etiológico</h3>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                      <Checkbox id="intake" checked={glimReducedIntake} onCheckedChange={(v) => setGlimReducedIntake(!!v)} />
                      <Label htmlFor="intake" className="cursor-pointer font-normal">
                        Ingestão reduzida (&lt;50% &gt;1 sem) ou má absorção
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                      <Checkbox id="inflam" checked={glimInflammation} onCheckedChange={(v) => setGlimInflammation(!!v)} />
                      <Label htmlFor="inflam" className="cursor-pointer font-normal">
                        Inflamação / Doença aguda ou crônica
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <Label>Contexto da Doença</Label>
                    <Select value={glimDisease} onValueChange={setGlimDisease}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cronica_com_inflamacao">Doença crônica com inflamação</SelectItem>
                        <SelectItem value="cronica_minima">Doença crônica com inflamação mínima</SelectItem>
                        <SelectItem value="aguda_grave">Doença aguda/injúria com inflamação grave</SelectItem>
                        <SelectItem value="social_ambiental">Circunstâncias sociais/ambientais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                <div className="md:col-span-2 mt-4 p-4 border-2 border-primary/20 rounded-lg bg-primary/5 text-center">
                  <p className="text-xs uppercase text-muted-foreground mb-1">Diagnóstico Final</p>
                  <p className="text-xl font-bold text-primary">{glimResult}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === WEIGHT/HEIGHT PREDICTION TAB (SIMPLIFIED CHUMLEA) === */}
          <TabsContent value="peso_altura" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Estimativa de Peso e Altura</CardTitle>
                  <CardDescription>Preencha os campos para estimar peso e altura usando as equações padrão já validadas.</CardDescription>
                </div>
                <Badge variant="secondary">Equações padronizadas</Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>Sexo</Label>
                      <Select value={predSex} onValueChange={(v: any) => setPredSex(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Idade (anos)</Label>
                      <Input type="number" value={predAge} onChange={e => setPredAge(e.target.value)} placeholder="Ex: 65" />
                    </div>
                    <div className="space-y-1">
                      <Label>Raça/Cor</Label>
                      <Select value={predRace} onValueChange={(v: any) => setPredRace(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="white">Branco(a)</SelectItem>
                          <SelectItem value="black">Negro(a)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Altura do Joelho (cm)</Label>
                      <Input type="number" value={predKnee} onChange={e => setPredKnee(e.target.value)} placeholder="Ex: 50" />
                    </div>
                    <div className="space-y-1">
                      <Label>Circunferência do Braço (cm)</Label>
                      <Input type="number" value={predArm} onChange={e => setPredArm(e.target.value)} placeholder="Ex: 28" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Para altura: preencha sexo, idade, raça/cor e altura do joelho. Para peso: informe também a circunferência do braço.</p>
                </div>

                <div className="space-y-4">
                  <div className="p-6 bg-muted/30 rounded-lg text-center space-y-4">
                    {/* Profile label */}
                    <p className="text-lg font-semibold text-foreground">
                      {predSex === "male"
                        ? (predRace === "white" ? "Homem Branco" : "Homem Negro")
                        : (predRace === "white" ? "Mulher Branca" : "Mulher Negra")}
                    </p>

                    {(predictionResult.heightMissingFields && predictionResult.weightMissingFields) ? (
                      <p className="text-sm text-amber-600">Preencha todos os campos para calcular.</p>
                    ) : (
                      <>
                        {/* Height */}
                        <div>
                          <p className="text-sm text-muted-foreground">Altura estimada</p>
                          {predictionResult.heightMissingFields ? (
                            <p className="text-sm text-amber-600">Preencha todos os campos para calcular.</p>
                          ) : predictionResult.heightInvalidError ? (
                            <p className="text-sm text-red-600">Verifique os dados informados.</p>
                          ) : (
                            <p className="text-3xl font-bold text-primary">{predictionResult.estHeightM} m</p>
                          )}
                        </div>

                        {/* Weight */}
                        <div className="border-t pt-4">
                          <p className="text-sm text-muted-foreground">Peso estimado</p>
                          {predictionResult.weightMissingFields ? (
                            <p className="text-sm text-amber-600">Preencha todos os campos para calcular.</p>
                          ) : predictionResult.weightMissingArm ? (
                            <p className="text-sm text-amber-600">Informe a circunferência do braço para estimar o peso.</p>
                          ) : predictionResult.weightNegativeError ? (
                            <p className="text-sm text-red-600">Verifique os dados informados.</p>
                          ) : (
                            <p className="text-3xl font-bold text-primary">{predictionResult.estWeightKg} kg</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === GIDS TAB === */}
          <TabsContent value="gids">
            <Card>
              <CardHeader>
                <CardTitle>GIDS - Escore de Disfunção Gastrointestinal</CardTitle>
                <CardDescription>
                  Calculadora guiada pela lógica publicada do GIDS: um único sintoma leve com ingestão oral mantida permanece em GIDS 0.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox checked={gidsOralDiet} onCheckedChange={(v) => setGidsOralDiet(Boolean(v))} />
                  <Label className="font-semibold">Paciente mantém ingestão oral?</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Critérios leves</p>
                    <p className="mt-1 text-2xl font-bold">{gidsResult.mildCount}</p>
                    <p className="text-xs text-muted-foreground">Sintomas de menor gravidade marcados</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Critérios maiores</p>
                    <p className="mt-1 text-2xl font-bold">{gidsResult.severeCount}</p>
                    <p className="text-xs text-muted-foreground">Critérios de disfunção/falência</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Ameaça à vida</p>
                    <p className="mt-1 text-2xl font-bold">{gidsResult.threateningCount}</p>
                    <p className="text-xs text-muted-foreground">Critérios críticos selecionados</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium mb-3 text-yellow-600">Critérios de baixo grau / risco</h4>
                    <div className="space-y-2">
                      {GIDS_MILD_OPTIONS.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox id={key} checked={gidsMild[key]} onCheckedChange={(v) => setGidsMild(p => ({ ...p, [key]: !!v }))} />
                          <Label htmlFor={key}>{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 text-orange-600">Critérios maiores</h4>
                    <div className="space-y-2">
                      {GIDS_SEVERE_DISPLAY_OPTIONS.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox id={key} checked={gidsSevere[key]} onCheckedChange={(v) => setGidsSevere(p => ({ ...p, [key]: !!v }))} />
                          <Label htmlFor={key}>{label}</Label>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-medium mt-6 mb-3 text-red-600">Ameaça à vida</h4>
                    <div className="space-y-2">
                      {GIDS_THREAT_OPTIONS.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox id={key} checked={gidsThreatening[key]} onCheckedChange={(v) => setGidsThreatening(p => ({ ...p, [key]: !!v }))} />
                          <Label htmlFor={key}>{label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border bg-muted/40 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-3xl font-bold">{gidsResult.score}</div>
                      <div className="text-sm font-semibold text-foreground">{gidsResult.interpretation}</div>
                      <p className="mt-1 text-sm text-muted-foreground">{gidsResult.description}</p>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground md:max-w-sm">
                      {gidsResult.rationale.map((item) => (
                        <p key={item}>{item}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === DVA TAB === */}
          <TabsContent value="dva">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Noradrenalina</CardTitle>
                  <CardDescription>Cálculo em mcg/kg/min</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Peso (kg)</Label>
                  <Input type="number" value={dvaWeight} onChange={e => setDvaWeight(e.target.value)} />
                  <Label>Velocidade (ml/h)</Label>
                  <Input type="number" value={norRate} onChange={e => setNorRate(e.target.value)} />
                  <Label>Diluição: Volume Total (ml)</Label>
                  <Input type="number" value={norDilution} onChange={e => setNorDilution(e.target.value)} />
                  <Label>Número de Ampolas (4mg)</Label>
                  <Input type="number" value={norAmpoules} onChange={e => setNorAmpoules(e.target.value)} />

                  <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded text-center">
                    <div className="text-lg font-bold">{dvaResult.norDose}</div>
                    <div className="text-xs uppercase">mcg / kg / min</div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vasopressina</CardTitle>
                  <CardDescription>Cálculo em UI/min (Sem peso)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Velocidade (ml/h)</Label>
                  <Input type="number" value={vasoRate} onChange={e => setVasoRate(e.target.value)} />
                  <Label>Diluição: Volume Total (ml)</Label>
                  <Input type="number" value={vasoDilution} onChange={e => setVasoDilution(e.target.value)} />
                  <Label>Número de Ampolas (20 UI)</Label>
                  <Input type="number" value={vasoAmpoules} onChange={e => setVasoAmpoules(e.target.value)} />

                  <div className="mt-4 p-3 bg-purple-50 text-purple-800 rounded text-center">
                    <div className="text-lg font-bold">{dvaResult.vasoDose}</div>
                    <div className="text-xs uppercase">UI / min</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* === NRS TAB === */}
          <TabsContent value="nrs">
            <Card>
              <CardHeader>
                <CardTitle>NRS 2002</CardTitle>
                <CardDescription>
                  A triagem inicial define se o rastreio final precisa ser preenchido. Se todas as respostas forem negativas, repetir semanalmente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 border p-3 rounded">
                    <p className="font-semibold text-sm">Triagem Inicial</p>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ1} onCheckedChange={v => setNrsQ1(!!v)} /> IMC &lt; 20.5?</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ2} onCheckedChange={v => setNrsQ2(!!v)} /> Perda de peso nos últimos 3 meses?</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ3} onCheckedChange={v => setNrsQ3(!!v)} /> Redução da ingestão na última semana?</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ4} onCheckedChange={v => setNrsQ4(!!v)} /> Paciente gravemente doente?</label>
                    <p className="pt-2 text-xs text-muted-foreground">
                      {nrsResult.needsFinalScreening
                        ? "Há pelo menos uma resposta positiva: preencher a pontuação final."
                        : "Sem respostas positivas: manter rastreio semanal."}
                    </p>
                  </div>
                  <div className="space-y-2 border p-3 rounded">
                    <p className="font-semibold text-sm">Pontuação Final</p>
                    <Label>Idade</Label>
                    <Input type="number" value={nrsAge} onChange={e => setNrsAge(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Idade &gt;= 70 anos soma {nrsResult.ageScore} ponto(s).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="space-y-3 border rounded p-4">
                    <div>
                      <p className="font-semibold text-sm">Estado nutricional</p>
                      <p className="text-xs text-muted-foreground">Escolha a descrição que melhor representa o paciente.</p>
                    </div>
                    <RadioGroup value={nrsNutritionScore} onValueChange={setNrsNutritionScore}>
                      {NRS_NUTRITION_OPTIONS.map((option) => (
                        <label key={option.value} className="flex gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                          <RadioGroupItem value={option.value} id={`nrs-nutrition-${option.value}`} className="mt-1" />
                          <div>
                            <p className="font-medium">{option.title}</p>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="space-y-3 border rounded p-4">
                    <div>
                      <p className="font-semibold text-sm">Gravidade da doença</p>
                      <p className="text-xs text-muted-foreground">Usar os protótipos do NRS 2002 para enquadrar o caso.</p>
                    </div>
                    <RadioGroup value={nrsDiseaseScore} onValueChange={setNrsDiseaseScore}>
                      {NRS_DISEASE_OPTIONS.map((option) => (
                        <label key={option.value} className="flex gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/40">
                          <RadioGroupItem value={option.value} id={`nrs-disease-${option.value}`} className="mt-1" />
                          <div>
                            <p className="font-medium">{option.title}</p>
                            <p className="text-sm text-muted-foreground">{option.description}</p>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/40 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:items-start">
                    <div>
                      <div className="text-xl font-bold">{nrsResult.score} pontos</div>
                      <div className="font-medium">{nrsResult.message}</div>
                      <p className="mt-2 text-sm text-muted-foreground">{nrsResult.recommendation}</p>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Estado nutricional: {nrsResult.nutritionOption.title}</p>
                      <p>Gravidade da doença: {nrsResult.diseaseOption.title}</p>
                      <p>Idade &gt;= 70 anos: {nrsResult.ageScore} ponto(s)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === PRODUCT CATALOG TAB === */}
          <TabsContent value="catalogo_produtos">
            <Card>
              <CardHeader>
                <CardTitle>Catálogo de Produtos</CardTitle>
                <CardDescription>Tabela consultiva com os produtos cadastrados para a unidade. Consulta somente, sem edicao ou exclusao nesta tela.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 max-w-md">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome do produto..."
                      value={catalogSearch}
                      onChange={e => setCatalogSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="border rounded-md overflow-auto max-h-[600px]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground sticky top-0">
                      <tr>
                        <th className="p-3 font-medium">Produto</th>
                        <th className="p-3 font-medium">Tipo</th>
                        <th className="p-3 font-medium">Sistema</th>
                        <th className="p-3 font-medium text-right">Apresentacao</th>
                        <th className="p-3 font-medium">Composicao</th>
                        <th className="p-3 font-medium">Faturamento</th>
                        <th className="p-3 font-medium">Residuos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...formulas, ...modules]
                        .filter((product) =>
                          !catalogSearch
                          || product.name.toLowerCase().includes(catalogSearch.toLowerCase())
                          || (product.manufacturer || "").toLowerCase().includes(catalogSearch.toLowerCase())
                          || (product.code || "").toLowerCase().includes(catalogSearch.toLowerCase())
                        )
                        .map((product) => {
                          const isFormula = "type" in product;
                          const unitLabel = product.presentationForm === "po" ? "g" : "mL";
                          const composition = isFormula
                            ? `${product.density ? `${product.density.toFixed(2)} kcal/${unitLabel.toLowerCase()}` : "-"} | ${product.proteinPerUnit ? `${product.proteinPerUnit} g PTN/${product.presentationForm === "po" ? "100 g" : "100 mL"}` : "PTN n/i"}`
                            : `${product.density ? `${product.density.toFixed(2)} kcal/${unitLabel.toLowerCase()}` : "-"} | ${product.protein ? `${product.protein} g PTN/${product.referenceAmount || 100}${product.presentationForm === "po" ? " g" : " mL"}` : "PTN n/i"}`;

                          const billing = `${product.billingUnit || "-"}${("billingPrice" in product && product.billingPrice) ? ` | R$ ${product.billingPrice.toFixed(2)}` : ""}`;
                          const waste = isFormula
                            ? [product.plasticG ? `Plástico ${product.plasticG}g` : "", product.paperG ? `Papel ${product.paperG}g` : "", product.metalG ? `Metal ${product.metalG}g` : "", product.glassG ? `Vidro ${product.glassG}g` : ""].filter(Boolean).join(" | ") || "-"
                            : "-";

                          return (
                          <tr key={product.id} className="border-t hover:bg-muted/20">
                            <td className="p-3">
                              <div className="font-semibold">{product.code ? `${product.code} - ${product.name}` : product.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {[product.manufacturer, product.description].filter(Boolean).join(" | ") || "-"}
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-xs capitalize">
                                {isFormula ? "Fórmula" : "Módulo"}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs">
                              {isFormula
                                ? product.systemType === "open"
                                  ? "Sistema aberto"
                                  : product.systemType === "closed"
                                    ? "Sistema fechado"
                                    : "Sistema aberto e fechado"
                                : "Qualquer sistema"}
                            </td>
                            <td className="p-3 text-right">{product.presentations?.join(", ") || "-"}</td>
                            <td className="p-3 text-xs">{composition}</td>
                            <td className="p-3 text-xs">{billing}</td>
                            <td className="p-3 text-xs text-muted-foreground max-w-[220px]">{waste}</td>
                          </tr>
                        )})}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">{[...formulas, ...modules].length} produtos cadastrados para a unidade</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === NITROGEN BALANCE PLACEHOLDER === */}
          <TabsContent value="balanco_n">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle>Balanço Nitrogenado</CardTitle>
                    <CardDescription>Cálculo do balanço nitrogenado para avaliação do estado metabólico.</CardDescription>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Em breve
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <Calculator className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Funcionalidade em Desenvolvimento</h3>
                  <p className="text-muted-foreground max-w-md">O cálculo de balanço nitrogenado estará disponível em breve. Permitirá avaliar a ingestão proteica versus as perdas nitrogenadas do paciente.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === ENERGY EXPENDITURE PLACEHOLDER === */}
          <TabsContent value="gasto_energetico">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle>Estimativa de Gasto Energético</CardTitle>
                    <CardDescription>Equações preditivas para estimativa de gasto energético basal e total.</CardDescription>
                  </div>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Em breve
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-6 mb-4">
                    <Calculator className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Funcionalidade em Desenvolvimento</h3>
                  <p className="text-muted-foreground max-w-md">A estimativa de gasto energético estará disponível em breve. Incluirá equações como Harris-Benedict, Mifflin-St Jeor e fatores de correção.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === LINKS & TOOLS CATALOG TAB === */}
          <TabsContent value="catalogo">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {toolsCatalog.map(tool => (
                <div key={tool.code} className="border p-3 rounded flex justify-between items-center bg-card">
                  <div>
                    <div className="font-medium">{tool.name}</div>
                    <p className="text-xs text-muted-foreground">{tool.category}</p>
                  </div>
                  <Badge variant="outline">{tool.code}</Badge>
                </div>
              ))}
            </div>
            <div className="mt-8">
              <h3 className="font-bold mb-4">Links Úteis</h3>
              <div className="grid grid-cols-1 gap-2">
                {linksToShow.map(l => (
                  <a key={l.link} href={l.link} target="_blank" className="text-primary hover:underline block p-2 border rounded hover:bg-muted/50">
                    {l.name}
                  </a>
                ))}
              </div>
            </div>
          </TabsContent>

        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Tools;
