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
import { Search, Calculator } from "lucide-react";
import { useAppTools } from "@/hooks/useDatabase";
import { useFormulas, useModules } from "@/hooks/useDatabase";
import {
  calculateNitrogenBalance,
} from "@/lib/automatedCalculations";

type Sex = "male" | "female" | "both";

const numberOrZero = (value: string | number): number => {
  const n = Number(String(value).replace(",", "."));
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
    title: "GIDS 0 (sem risco)",
    description: "Sem sintomas, ou apenas um sintoma leve com ingestão oral mantida.",
  },
  1: {
    title: "GIDS 1 (risco aumentado)",
    description: "Acúmulo inicial de sinais gastrointestinais ou ausência de ingestão oral.",
  },
  2: {
    title: "GIDS 2 (disfunção gastrointestinal)",
    description: "Três ou mais critérios leves/de risco ou até dois critérios maiores.",
  },
  3: {
    title: "GIDS 3 (falência gastrointestinal)",
    description: "Três ou mais critérios maiores, sugerindo perda importante de função.",
  },
  4: {
    title: "GIDS 4 (ameaça à vida)",
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
  const currentHospitalId = typeof window !== "undefined" ? localStorage.getItem("userHospitalId") || "" : "";
  const [catalogSearch, setCatalogSearch] = useState("");

  // Form inputs for Prediction
  const [predSex, setPredSex] = useState<Sex>("male");
  const [predAge, setPredAge] = useState("65");
  const [predKnee, setPredKnee] = useState("");
  const [predArm, setPredArm] = useState("");
  const [predCalf, setPredCalf] = useState("");
  const [predSubscapular, setPredSubscapular] = useState("");

  const predictionResult = useMemo(() => {
    const age = numberOrZero(predAge);
    const knee = numberOrZero(predKnee);
    const arm = numberOrZero(predArm);
    const calf = numberOrZero(predCalf);
    const subscapular = numberOrZero(predSubscapular);

    const hasAge = predAge !== "" && age > 0;
    const hasKnee = predKnee !== "" && knee > 0;
    const hasArm = predArm !== "" && arm > 0;
    const hasCalf = predCalf !== "" && calf > 0;
    const hasSubscapular = predSubscapular !== "" && subscapular > 0;

    // --- HEIGHT: requires sex, age and knee height ---
    let estHeight = 0;
    let heightMissingFields = false;
    let heightInvalidError = false;

    if (!hasAge || !hasKnee) {
      heightMissingFields = true;
    } else {
      const rawHeight = predSex === "male"
        ? 64.19 - (0.04 * age) + (2.02 * knee)
        : 84.88 - (0.24 * age) + (1.83 * knee);
      if (rawHeight <= 0) {
        heightInvalidError = true;
      } else {
        estHeight = rawHeight;
      }
    }

    // --- WEIGHT: requires knee height, arm circumference, calf circumference and subscapular skinfold ---
    let estWeight = 0;
    let weightMissingFields = false;
    let weightNegativeError = false;

    if (!hasKnee || !hasArm || !hasCalf || !hasSubscapular) {
      weightMissingFields = true;
    } else {
      const rawWeight = predSex === "male"
        ? (0.98 * calf) + (1.16 * knee) + (1.73 * arm) + (0.37 * subscapular) - 81.69
        : (1.27 * calf) + (0.87 * knee) + (0.98 * arm) + (0.4 * subscapular) - 62.35;
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
      heightMissingFields,
      heightInvalidError,
      weightMissingFields,
      weightNegativeError,
    };
  }, [predSex, predAge, predKnee, predArm, predCalf, predSubscapular]);

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

    let diagnosis = "Não desnutrido (GLIM, 2018).";
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
      diagnosis = `${severity} ${diseaseMap[glimDisease] || ""} (GLIM, 2018).`;
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

  const [nitrogenProtein, setNitrogenProtein] = useState("");
  const [nitrogenUun, setNitrogenUun] = useState("");
  const [nitrogenAdditionalLosses, setNitrogenAdditionalLosses] = useState("4");
  const nitrogenBalance = useMemo(() => {
    if (!nitrogenProtein || !nitrogenUun) return null;
    return calculateNitrogenBalance(
      numberOrZero(nitrogenProtein),
      numberOrZero(nitrogenUun),
      numberOrZero(nitrogenAdditionalLosses),
    );
  }, [nitrogenProtein, nitrogenUun, nitrogenAdditionalLosses]);

  const [energySex, setEnergySex] = useState<"male" | "female">("male");
  const [energyWeight, setEnergyWeight] = useState("");
  const [energyHeight, setEnergyHeight] = useState("");
  const [energyAge, setEnergyAge] = useState("");
  const [energyPocketKcalKg, setEnergyPocketKcalKg] = useState("25");
  const energyResults = useMemo(() => {
    const weight = numberOrZero(energyWeight);
    const rawHeight = numberOrZero(energyHeight);
    const heightCm = rawHeight > 0 && rawHeight <= 3 ? rawHeight * 100 : rawHeight;
    const age = numberOrZero(energyAge);
    const pocketKcalKg = numberOrZero(energyPocketKcalKg);

    const hasBaseInputs = weight > 0 && age > 0;
    const hasHeight = heightCm > 0;

    const iretonJones = hasBaseInputs
      ? 1784 + (5 * weight) - (11 * age) + (energySex === "male" ? 244 : 0)
      : 0;
    const harrisBenedict = hasBaseInputs && hasHeight
      ? energySex === "male"
        ? 66.5 + (13.75 * weight) + (5 * heightCm) - (6.75 * age)
        : 655 + (9.5 * weight) + (1.84 * heightCm) - (4.67 * age)
      : 0;
    const pocketFormula = weight > 0 && pocketKcalKg > 0 ? weight * pocketKcalKg : 0;

    return {
      iretonJones,
      harrisBenedict,
      pocketFormula,
      pocketKcalKg,
      hasAnyResult: iretonJones > 0 || harrisBenedict > 0 || pocketFormula > 0,
    };
  }, [energyAge, energyHeight, energyPocketKcalKg, energySex, energyWeight]);

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
  const visibleProducts = useMemo(
    () => [...formulas, ...modules].filter((product) => !currentHospitalId || !product.hospitalId || product.hospitalId === currentHospitalId),
    [currentHospitalId, formulas, modules],
  );
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
                  <p className="text-xs uppercase text-muted-foreground mb-1">Diagnóstico Nutricional:</p>
                  <p className="text-xl font-bold text-primary">{glimResult}</p>
                </div>
                <div className="md:col-span-2 rounded-md bg-muted/40 p-3 text-[11px] leading-snug text-muted-foreground">
                  <p className="font-semibold text-foreground/70">Referência:</p>
                  <p>CEDERHOLM, T.; JENSEN, G. L.; CORREIA, M. I. T. D.; et al. GLIM criteria for the diagnosis of malnutrition - A consensus report from the global clinical nutrition community. Clinical Nutrition, v. 38, n. 1, p. 1-9, 2019.</p>
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
                  <CardDescription>Preencha os campos para estimar estatura e peso, utilizando equações antropométricas de Chumlea.</CardDescription>
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
                      <Label>Altura do Joelho (cm)</Label>
                      <Input type="number" value={predKnee} onChange={e => setPredKnee(e.target.value)} placeholder="Ex: 50" />
                    </div>
                    <div className="space-y-1">
                      <Label>Circunferência do Braço (cm)</Label>
                      <Input type="number" value={predArm} onChange={e => setPredArm(e.target.value)} placeholder="Ex: 28" />
                    </div>
                    <div className="space-y-1">
                      <Label>Circunferência da Panturrilha (cm)</Label>
                      <Input type="number" value={predCalf} onChange={e => setPredCalf(e.target.value)} placeholder="Ex: 34" />
                    </div>
                    <div className="space-y-1">
                      <Label>Dobra Subescapular (mm)</Label>
                      <Input type="number" value={predSubscapular} onChange={e => setPredSubscapular(e.target.value)} placeholder="Ex: 12" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Para altura: sexo, idade e altura do joelho. Para peso: altura do joelho, circunferência do braço, circunferência da panturrilha e dobra subescapular.</p>
                  <div className="rounded-md bg-muted/40 p-3 text-[11px] leading-snug text-muted-foreground">
                    <p className="font-semibold text-foreground/70">Referências:</p>
                    <p>CHUMLEA, William Cameron; ROCHE, Alex F.; STEINBAUGH, Maria L. Estimating Stature from Knee Height for Persons 60 to 90 Years of Age. Journal of the American Geriatrics Society, v. 33, n. 2, p. 116-120, 1985.</p>
                    <p>CHUMLEA, W. C.; GUO, S.; ROCHE, A. F.; et al. Prediction of body weight for the nonambulatory elderly from anthropometry. Journal of the American Dietetic Association, v. 88, n. 5, p. 564-568, 1988.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-6 bg-muted/30 rounded-lg text-center space-y-4">
                    {/* Profile label */}
                    <p className="text-lg font-semibold text-foreground">
                      {predSex === "male"
                        ? "Homem"
                        : "Mulher"}
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
                  Calculadora elaborada a partir do GIDS (Reintam Blaser et al., 2021).
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
                <div className="rounded-md bg-muted/40 p-3 text-[11px] leading-snug text-muted-foreground">
                  <p className="font-semibold text-foreground/70">Referência:</p>
                  <p>REINTAM BLASER, Annika; PADAR, Martin; MÄNDUL, Merli; et al. Development of the Gastrointestinal Dysfunction Score (GIDS) for critically ill patients - A prospective multicenter observational study (iSOFA study). Clinical Nutrition, v. 40, n. 8, p. 4932-4940, 2021.</p>
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
                  <CardDescription>Cálculo em UI/min</CardDescription>
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
            <div className="mt-4 rounded-md bg-muted/40 p-3 text-[11px] leading-snug text-muted-foreground">
              <p className="font-semibold text-foreground/70">Referência:</p>
              <p>Gottschall CBA, Schneider CD, Rabito EI, Busnello FM. Guia prático de clínica nutricional: tabelas, valores e referências. São Paulo: Atheneu; 2012.</p>
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
                <div className="rounded-md bg-muted/40 p-3 text-[11px] leading-snug text-muted-foreground">
                  <p className="font-semibold text-foreground/70">Referência:</p>
                  <p>Kondrup J. Nutritional risk screening (NRS 2002): a new method based on an analysis of controlled clinical trials. Clin Nutr, n. 22, v. 3, p. 321-36, 2003.</p>
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
                      {visibleProducts
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
                <p className="text-xs text-muted-foreground mt-3">{visibleProducts.length} produtos cadastrados para a unidade</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === NITROGEN BALANCE === */}
          <TabsContent value="balanco_n">
            <Card>
              <CardHeader>
                <CardTitle>Balanço Nitrogenado</CardTitle>
                <CardDescription>Estimativa pela ingestão proteica e pelo nitrogênio ureico urinário de 24 horas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="nitrogen-protein">Proteína ingerida (g/dia)</Label>
                    <Input id="nitrogen-protein" type="number" min="0" step="0.1" value={nitrogenProtein} onChange={(event) => setNitrogenProtein(event.target.value)} placeholder="Ex: 90" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nitrogen-uun">Nitrogênio ureico urinário - UUN (g/24h)</Label>
                    <Input id="nitrogen-uun" type="number" min="0" step="0.1" value={nitrogenUun} onChange={(event) => setNitrogenUun(event.target.value)} placeholder="Ex: 12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nitrogen-losses">Perdas adicionais estimadas (g/dia)</Label>
                    <Input id="nitrogen-losses" type="number" min="0" step="0.1" value={nitrogenAdditionalLosses} onChange={(event) => setNitrogenAdditionalLosses(event.target.value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Fórmula: proteína / 6,25 - (UUN + perdas adicionais). O valor padrão de perdas adicionais é 4 g/dia e pode ser ajustado pela equipe.</p>
                {nitrogenBalance && (
                  <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-4">
                    <div><p className="text-xs text-muted-foreground">Entrada de N</p><p className="text-xl font-bold">{nitrogenBalance.nitrogenIntake.toFixed(1)} g</p></div>
                    <div><p className="text-xs text-muted-foreground">Saída de N</p><p className="text-xl font-bold">{nitrogenBalance.nitrogenOutput.toFixed(1)} g</p></div>
                    <div><p className="text-xs text-muted-foreground">Balanço</p><p className="text-xl font-bold">{nitrogenBalance.balance.toFixed(1)} g</p></div>
                    <div><p className="text-xs text-muted-foreground">Interpretação</p><p className="text-lg font-semibold">{nitrogenBalance.status}</p></div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Ferramenta de apoio. O resultado deve ser interpretado junto ao quadro clínico, função renal e perdas não urinárias.</p>
                <div className="rounded-md bg-muted/40 p-3 text-[11px] leading-snug text-muted-foreground">
                  <p className="font-semibold text-foreground/70">Referência:</p>
                  <p>Balanço nitrogenado estimado pela ingestão de nitrogênio proteico menos perdas urinárias e perdas insensíveis: BN = proteína/6,25 - (UUN + 4). Usar como ferramenta de apoio clínico.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === ENERGY EXPENDITURE === */}
          <TabsContent value="gasto_energetico">
            <Card>
              <CardHeader>
                <CardTitle>Estimativa de Gasto Energético</CardTitle>
                <CardDescription>Preencha os dados uma vez para visualizar Ireton-Jones, Harris-Benedict e fórmula de bolso na mesma tela.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Sexo</Label>
                    <Select value={energySex} onValueChange={(value) => setEnergySex(value as "male" | "female")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Masculino</SelectItem>
                        <SelectItem value="female">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="energy-age">Idade (anos)</Label>
                    <Input id="energy-age" type="number" min="18" step="1" value={energyAge} onChange={(event) => setEnergyAge(event.target.value)} placeholder="Ex: 65" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="energy-weight">Peso (kg)</Label>
                    <Input id="energy-weight" type="number" min="0" step="0.1" value={energyWeight} onChange={(event) => setEnergyWeight(event.target.value)} placeholder="Ex: 70" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="energy-height">Estatura (m)</Label>
                    <Input id="energy-height" type="number" min="0" step="0.01" value={energyHeight} onChange={(event) => setEnergyHeight(event.target.value)} placeholder="Ex: 1.70" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="energy-pocket">Fórmula de bolso (kcal/kg)</Label>
                    <Input id="energy-pocket" type="number" min="0" step="1" value={energyPocketKcalKg} onChange={(event) => setEnergyPocketKcalKg(event.target.value)} placeholder="Ex: 25" />
                  </div>
                </div>
                {energyResults.hasAnyResult ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-sm font-semibold text-muted-foreground">Ireton-Jones (1997)</p>
                      <p className="mt-2 text-2xl font-bold">{energyResults.iretonJones > 0 ? Math.round(energyResults.iretonJones) : "-"} kcal/dia</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-sm font-semibold text-muted-foreground">Harris-Benedict (1919)</p>
                      <p className="mt-2 text-2xl font-bold">{energyResults.harrisBenedict > 0 ? Math.round(energyResults.harrisBenedict) : "-"} kcal/dia</p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-sm font-semibold text-muted-foreground">Fórmula de bolso</p>
                      <p className="mt-2 text-2xl font-bold">{energyResults.pocketFormula > 0 ? Math.round(energyResults.pocketFormula) : "-"} kcal/dia</p>
                      <p className="mt-1 text-xs text-muted-foreground">{energyResults.pocketKcalKg || 0} kcal/kg</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Informe idade, peso e estatura para calcular as estimativas. A fórmula de bolso usa peso e o valor de kcal/kg.
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Ferramenta para uso em adultos. O usuário visualiza os três resultados e escolhe qual estimativa usar na prescrição.</p>
                <div className="rounded-md bg-muted/40 p-3 text-[11px] leading-snug text-muted-foreground">
                  <p className="font-semibold text-foreground/70">Referências:</p>
                  <p>Ireton-Jones (1997): masculino = 1784 + 5 x peso - 11 x idade + 244; feminino = 1784 + 5 x peso - 11 x idade. Harris-Benedict (1919): masculino = 66,5 + 13,75 x peso + 5 x estatura(cm) - 6,75 x idade; feminino = 655 + 9,5 x peso + 1,84 x estatura(cm) - 4,67 x idade.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === LINKS & TOOLS CATALOG TAB === */}
          <TabsContent value="catalogo">
            <div>
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
