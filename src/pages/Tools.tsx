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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Save } from "lucide-react";
import { useAppTools } from "@/hooks/useDatabase";
import { toast } from "sonner";

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
  { id: "chumlea_w_m_h", name: "Chumlea (Homem Branco) - Altura", type: "height", sex: "male", race: "white", minAge: 60, maxAge: 120, coefKnee: 1.88, coefArm: 0, coefAge: 0, constant: 71.85, isActive: true },
  { id: "chumlea_w_m_w", name: "Chumlea (Homem Branco) - Peso", type: "weight", sex: "male", race: "white", minAge: 60, maxAge: 120, coefKnee: 1.19, coefArm: 3.21, coefAge: 0, constant: -86.82, isActive: true },
  // Chumlea - Black Male
  { id: "chumlea_b_m_h", name: "Chumlea (Homem Negro) - Altura", type: "height", sex: "male", race: "black", minAge: 60, maxAge: 120, coefKnee: 1.79, coefArm: 0, coefAge: 0, constant: 73.42, isActive: true },
  { id: "chumlea_b_m_w", name: "Chumlea (Homem Negro) - Peso", type: "weight", sex: "male", race: "black", minAge: 60, maxAge: 120, coefKnee: 1.09, coefArm: 3.14, coefAge: 0, constant: -83.72, isActive: true },
  // Chumlea - White Female
  { id: "chumlea_w_f_h", name: "Chumlea (Mulher Branca) - Altura", type: "height", sex: "female", race: "white", minAge: 60, maxAge: 120, coefKnee: 1.87, coefArm: 0, coefAge: -0.06, constant: 70.25, isActive: true },
  { id: "chumlea_w_f_w", name: "Chumlea (Mulher Branca) - Peso", type: "weight", sex: "female", race: "white", minAge: 60, maxAge: 120, coefKnee: 1.01, coefArm: 2.81, coefAge: 0, constant: -66.04, isActive: true },
  // Chumlea - Black Female
  { id: "chumlea_b_f_h", name: "Chumlea (Mulher Negra) - Altura", type: "height", sex: "female", race: "black", minAge: 60, maxAge: 120, coefKnee: 1.86, coefArm: 0, coefAge: -0.06, constant: 68.1, isActive: true },
  { id: "chumlea_b_f_w", name: "Chumlea (Mulher Negra) - Peso", type: "weight", sex: "female", race: "black", minAge: 60, maxAge: 120, coefKnee: 1.24, coefArm: 2.97, coefAge: 0, constant: -82.48, isActive: true },
];

const numberOrZero = (value: string | number): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// --- Helper Data ---
const TOOLS_FALLBACK = [
  { code: "PESO_ALTURA", name: "Estimativa de peso e altura", category: "antropometria" },
  { code: "GIDS", name: "Escore GIDS", category: "triagem" },
  { code: "DVA_NOR", name: "Calculadora de Noradrenalina", category: "critico" },
  { code: "DVA_VASO", name: "Calculadora de Vasopressina", category: "critico" },
  { code: "NRS", name: "Triagem NRS 2002", category: "triagem" },
  { code: "BALANCO_N", name: "Balanco nitrogenado", category: "metabolico" },
  { code: "GASTO_ENERGETICO", name: "Estimativa de gasto energetico", category: "metabolico" },
  { code: "GLIM", name: "Diagnostico GLIM", category: "triagem" },
];

const LINKS_FALLBACK = [
  { name: "Diretrizes SBNPE", link: "https://www.sbnpe.org.br/diretrizes" },
  { name: "Guidelines ESPEN", link: "https://www.espen.org/guidelines-home/espen-guidelines" },
  { name: "Guidelines ASPEN", link: "https://nutritioncare.org/clinical-resources/guidelines-standards/" },
  { name: "Formulario MAN", link: "https://www.mna-elderly.com/sites/default/files/2024-10/MNA_AU2.0_%20por-BR_nonMapi.pdf" },
  { name: "GMFCS em portugues", link: "https://canchild.ca/wp-content/uploads/2025/03/GMFCS-ER_Translation-Portuguese2.pdf" },
  { name: "Curvas OMS", link: "https://www.sbp.com.br/departamentos/endocrinologia/graficos-de-crescimento/" },
  { name: "Curvas para paralisia cerebral", link: "https://www.lifeexpectancy.org/Articles/NewGrowthCharts.shtml" },
  { name: "Global GLIM Leadership", link: "https://www.glim-initiative.org/" },
];

// --- GIDS Types ---
type GidsMildKey = "absentBowelSounds" | "vomiting" | "residualVolume" | "ileus" | "distension" | "mildDiarrhea" | "giBleedNoTransfusion" | "pia12to20";
type GidsSevereKey = "severeDiarrhea" | "giBleedWithTransfusion" | "prokinetics" | "piaAbove20";
type GidsThreateningKey = "hemorrhagicShock" | "mesentericIschemia" | "abdominalCompartment";

const GIDS_MILD_OPTIONS: Array<{ key: GidsMildKey; label: string }> = [
  { key: "absentBowelSounds", label: "Ausencia de ruidos intestinais" },
  { key: "vomiting", label: "Vomitos" },
  { key: "residualVolume", label: "Aumento do volume residual gastrico" },
  { key: "ileus", label: "Ileo paralitico" },
  { key: "distension", label: "Distensao abdominal" },
  { key: "mildDiarrhea", label: "Diarreia leve" },
  { key: "giBleedNoTransfusion", label: "Sangramento gastrointestinal sem transfusao" },
  { key: "pia12to20", label: "PIA entre 12 e 20 mmHg" },
];
const GIDS_SEVERE_OPTIONS: Array<{ key: GidsSevereKey; label: string }> = [
  { key: "severeDiarrhea", label: "Diarreia grave" },
  { key: "giBleedWithTransfusion", label: "Sangramento gastrointestinal com transfusao" },
  { key: "prokinetics", label: "Uso de procineticos para tolerancia" },
  { key: "piaAbove20", label: "PIA acima de 20 mmHg" },
];
const GIDS_THREAT_OPTIONS: Array<{ key: GidsThreateningKey; label: string }> = [
  { key: "hemorrhagicShock", label: "Choque hemorragico" },
  { key: "mesentericIschemia", label: "Isquemia mesenterica" },
  { key: "abdominalCompartment", label: "Sindrome compartimental abdominal" },
];

const Tools = () => {
  const { tools } = useAppTools();

  // --- PREDICTIVE EQUATIONS STATE ---
  const [equations, setEquations] = useState<PredictiveEquation[]>(() => {
    const saved = localStorage.getItem('predictive_equations');
    return saved ? JSON.parse(saved) : DEFAULT_EQUATIONS;
  });

  const [isEquationEditorOpen, setIsEquationEditorOpen] = useState(false);
  const [editingEquation, setEditingEquation] = useState<PredictiveEquation | null>(null);

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

    const estHeight = heightEq
      ? heightEq.constant + (heightEq.coefKnee * knee) + (heightEq.coefArm * arm) + (heightEq.coefAge * age)
      : 0;

    const estWeight = weightEq
      ? weightEq.constant + (weightEq.coefKnee * knee) + (weightEq.coefArm * arm) + (weightEq.coefAge * age)
      : 0;

    return {
      estHeightCm: Number(estHeight.toFixed(2)),
      estHeightM: Number((estHeight / 100).toFixed(2)),
      estWeightKg: Number(estWeight.toFixed(2)),
      heightEqName: heightEq?.name || "Nenhuma equacao encontrada",
      weightEqName: weightEq?.name || "Nenhuma equacao encontrada"
    };
  }, [equations, predSex, predRace, predAge, predKnee, predArm]);

  const handleSaveEquation = (eq: PredictiveEquation) => {
    let newEquations;
    if (equations.find(e => e.id === eq.id)) {
      newEquations = equations.map(e => e.id === eq.id ? eq : e);
    } else {
      newEquations = [...equations, eq];
    }
    setEquations(newEquations);
    localStorage.setItem('predictive_equations', JSON.stringify(newEquations));
    setEditingEquation(null);
    setIsEquationEditorOpen(false);
    toast.success("Equacao salva com sucesso!");
  };

  const handleResetEquations = () => {
    setEquations(DEFAULT_EQUATIONS);
    localStorage.setItem('predictive_equations', JSON.stringify(DEFAULT_EQUATIONS));
    toast.success("Equacoes restauradas para o padrao.");
  }


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

    let diagnosis = "Sem diagnostico de desnutricao (GLIM)";
    let severity = "";

    if (phenoPositive && etioPositive) {
      // Determine severity based on PHENOTYPIC
      const isSevere = glimWeightLoss === "severe" || glimBmi === "severe" || glimMuscleLoss === "severe";
      severity = isSevere ? "Desnutricao Grave" : "Desnutricao Moderada";

      const diseaseMap: Record<string, string> = {
        cronica_com_inflamacao: "relacionada a doenca cronica com inflamacao",
        cronica_minima: "relacionada a doenca cronica com inflamacao minima",
        aguda_grave: "relacionada a doenca aguda ou injuria com inflamacao grave",
        social_ambiental: "relacionada a circunstancias sociais ou ambientais",
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
    severeDiarrhea: false, giBleedWithTransfusion: false, prokinetics: false, piaAbove20: false,
  });
  const [gidsThreatening, setGidsThreatening] = useState<Record<GidsThreateningKey, boolean>>({
    hemorrhagicShock: false, mesentericIschemia: false, abdominalCompartment: false,
  });

  const gidsResult = useMemo(() => {
    const mildCount = Object.values(gidsMild).filter(Boolean).length;
    const severeCount = Object.values(gidsSevere).filter(Boolean).length;
    const threateningCount = Object.values(gidsThreatening).filter(Boolean).length;
    let score = 0; let interpretation = "Sem risco";

    if (threateningCount > 0) { score = 4; interpretation = "Ameaca a vida"; }
    else if (severeCount >= 3) { score = 3; interpretation = "Falencia do trato gastrointestinal"; }
    else if ((!gidsOralDiet && mildCount >= 2) || (severeCount >= 1 && severeCount <= 2)) { score = 2; interpretation = "Disfuncao do trato gastrointestinal"; }
    else if (!gidsOralDiet && mildCount >= 1 && mildCount <= 2) { score = 1; interpretation = "Risco aumentado"; }
    else if (gidsOralDiet && mildCount <= 1) { score = 0; interpretation = "Sem risco"; }

    return { score, interpretation };
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
    if (!(nrsQ1 || nrsQ2 || nrsQ3 || nrsQ4)) return { score: 0, message: "Sem risco nutricional." };
    const ageScore = numberOrZero(nrsAge) >= 70 ? 1 : 0;
    const total = numberOrZero(nrsNutritionScore) + numberOrZero(nrsDiseaseScore) + ageScore;
    return { score: total, message: total >= 3 ? "RISCO NUTRICIONAL." : "Sem risco nutricional." };
  }, [nrsQ1, nrsQ2, nrsQ3, nrsQ4, nrsAge, nrsNutritionScore, nrsDiseaseScore]);

  const toolsCatalog = tools.length > 0 ? tools : TOOLS_FALLBACK;
  const linksToShow = tools.filter(t => t.link).length > 0 ? tools.filter(t => t.link) : LINKS_FALLBACK;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/35 to-background pb-20">
      <Header />
      <div className="container px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ferramentas Clinicas</h1>
          <p className="text-muted-foreground">Calculadoras e utilitarios para avaliacao nutricional.</p>
        </div>

        <Tabs defaultValue="peso_altura" className="space-y-4">
          <TabsList className="bg-card border w-full justify-start overflow-x-auto">
            <TabsTrigger value="peso_altura">Peso e Altura</TabsTrigger>
            <TabsTrigger value="glim">GLIM</TabsTrigger>
            <TabsTrigger value="gids">GIDS</TabsTrigger>
            <TabsTrigger value="dva">Drogas Vasoativas</TabsTrigger>
            <TabsTrigger value="nrs">NRS 2002</TabsTrigger>
            <TabsTrigger value="catalogo">Catalogo</TabsTrigger>
          </TabsList>

          {/* === GLIM TAB === */}
          <TabsContent value="glim" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Diagnostico Nutricional (GLIM)</CardTitle>
                <CardDescription>Criterios fenotipicos e etiologicos para diagnostico de desnutricao.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-1">Dominio Fenotipico</h3>

                  <div className="space-y-1">
                    <Label>Perda de Peso Involuntaria</Label>
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
                    <Label>Reducao da Massa Muscular</Label>
                    <Select value={glimMuscleLoss} onValueChange={(v: any) => setGlimMuscleLoss(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ausente</SelectItem>
                        <SelectItem value="moderate">Moderada (Deficit leve por metodo validado)</SelectItem>
                        <SelectItem value="severe">Grave (Deficit grave por metodo validado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm uppercase text-muted-foreground border-b pb-1">Dominio Etiologico</h3>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                      <Checkbox id="intake" checked={glimReducedIntake} onCheckedChange={(v) => setGlimReducedIntake(!!v)} />
                      <Label htmlFor="intake" className="cursor-pointer font-normal">
                        Ingestao reduzida (&lt;50% &gt;1 sem) ou ma absorcao
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-3 rounded hover:bg-muted/50 transition-colors">
                      <Checkbox id="inflam" checked={glimInflammation} onCheckedChange={(v) => setGlimInflammation(!!v)} />
                      <Label htmlFor="inflam" className="cursor-pointer font-normal">
                        Inflamacao / Doenca aguda ou cronica
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <Label>Contexto da Doenca</Label>
                    <Select value={glimDisease} onValueChange={setGlimDisease}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cronica_com_inflamacao">Doenca cronica com inflamacao</SelectItem>
                        <SelectItem value="cronica_minima">Doenca cronica com inflamacao minima</SelectItem>
                        <SelectItem value="aguda_grave">Doenca aguda/injuria com inflamacao grave</SelectItem>
                        <SelectItem value="social_ambiental">Circunstancias sociais/ambientais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                <div className="md:col-span-2 mt-4 p-4 border-2 border-primary/20 rounded-lg bg-primary/5 text-center">
                  <p className="text-xs uppercase text-muted-foreground mb-1">Diagnostico Final</p>
                  <p className="text-xl font-bold text-primary">{glimResult}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === WEIGHT/HEIGHT PREDICTION TAB === */}
          <TabsContent value="peso_altura" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Estimativa de Peso e Altura</CardTitle>
                  <CardDescription>Calculo automatico baseado em formulas configuraveis (Idade, Raca, Sexo).</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEquationEditorOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Configurar Formulas
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
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
                      <Label>Raca cor</Label>
                      <Select value={predRace} onValueChange={(v: any) => setPredRace(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="white">Branca</SelectItem>
                          <SelectItem value="black">Negra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Idade</Label>
                      <Input type="number" value={predAge} onChange={e => setPredAge(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Altura Joelho (cm)</Label>
                      <Input type="number" value={predKnee} onChange={e => setPredKnee(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Circunf. Braco (cm)</Label>
                      <Input type="number" value={predArm} onChange={e => setPredArm(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase">Formula de Altura Identificada</p>
                      <p className="text-sm font-medium">{predictionResult.heightEqName}</p>
                      <div className="text-2xl font-bold mt-1 text-primary">{predictionResult.estHeightM} m <span className="text-sm text-foreground font-normal">({predictionResult.estHeightCm} cm)</span></div>
                    </div>
                    <div className="border-t pt-3">
                      <p className="text-xs text-muted-foreground uppercase">Formula de Peso Identificada</p>
                      <p className="text-sm font-medium">{predictionResult.weightEqName}</p>
                      <div className="text-2xl font-bold mt-1 text-primary">{predictionResult.estWeightKg} kg</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Equation Editor Dialog */}
            <Dialog open={isEquationEditorOpen} onOpenChange={setIsEquationEditorOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configuracao de Formulas Preditivas</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">Formulas cadastradas e seus coeficientes.</p>
                    <Button size="sm" variant="secondary" onClick={handleResetEquations}>Restaurar Padrao</Button>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="p-2">Nome</th>
                          <th className="p-2">Tipo</th>
                          <th className="p-2">Sexo/Raca</th>
                          <th className="p-2">Idade</th>
                          <th className="p-2 text-right">Const.</th>
                          <th className="p-2 text-right">AJ</th>
                          <th className="p-2 text-right">CB</th>
                          <th className="p-2 text-right">Idade</th>
                          <th className="p-2 text-center">Acao</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equations.map(eq => (
                          <tr key={eq.id} className="border-t hover:bg-muted/20">
                            <td className="p-2 font-medium">{eq.name}</td>
                            <td className="p-2 uppercase text-xs">{eq.type === 'height' ? 'Alt' : 'Peso'}</td>
                            <td className="p-2 text-xs">{eq.sex === 'male' ? 'M' : 'F'} / {eq.race === 'white' ? 'B' : 'N'}</td>
                            <td className="p-2 text-xs">{eq.minAge}-{eq.maxAge}</td>
                            <td className="p-2 text-right font-mono text-xs">{eq.constant}</td>
                            <td className="p-2 text-right font-mono text-xs">{eq.coefKnee}</td>
                            <td className="p-2 text-right font-mono text-xs">{eq.coefArm}</td>
                            <td className="p-2 text-right font-mono text-xs">{eq.coefAge}</td>
                            <td className="p-2 text-center">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                setEditingEquation(eq);
                              }}>
                                <Edit className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {editingEquation && (
                    <div className="p-4 border rounded-md bg-secondary/10 space-y-3">
                      <h4 className="font-semibold text-sm">Editar: {editingEquation.name}</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div><Label>Constante</Label><Input type="number" step="0.01" value={editingEquation.constant} onChange={e => setEditingEquation({ ...editingEquation, constant: Number(e.target.value) })} /></div>
                        <div><Label>Coef. Alt. Joelho</Label><Input type="number" step="0.01" value={editingEquation.coefKnee} onChange={e => setEditingEquation({ ...editingEquation, coefKnee: Number(e.target.value) })} /></div>
                        <div><Label>Coef. Circ. Braco</Label><Input type="number" step="0.01" value={editingEquation.coefArm} onChange={e => setEditingEquation({ ...editingEquation, coefArm: Number(e.target.value) })} /></div>
                        <div><Label>Coef. Idade</Label><Input type="number" step="0.01" value={editingEquation.coefAge} onChange={e => setEditingEquation({ ...editingEquation, coefAge: Number(e.target.value) })} /></div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingEquation(null)}>Cancelar</Button>
                        <Button size="sm" onClick={() => editingEquation && handleSaveEquation(editingEquation)}><Save className="h-3 w-3 mr-2" /> Salvar</Button>
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* === GIDS TAB === */}
          <TabsContent value="gids">
            <Card>
              <CardHeader>
                <CardTitle>GIDS - Escore de Disfuncao Gastrointestinal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox checked={gidsOralDiet} onCheckedChange={(v) => setGidsOralDiet(Boolean(v))} />
                  <Label className="font-semibold">Paciente recebe dieta oral?</Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-medium mb-3 text-yellow-600">Sintomas Leves (1 ponto)</h4>
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
                    <h4 className="font-medium mb-3 text-orange-600">Sintomas Graves (3 pontos)</h4>
                    <div className="space-y-2">
                      {GIDS_SEVERE_OPTIONS.map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox id={key} checked={gidsSevere[key]} onCheckedChange={(v) => setGidsSevere(p => ({ ...p, [key]: !!v }))} />
                          <Label htmlFor={key}>{label}</Label>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-medium mt-6 mb-3 text-red-600">Ameaca a Vida (4 pontos)</h4>
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

                <div className="mt-6 p-4 bg-muted rounded-md text-center">
                  <div className="text-3xl font-bold">{gidsResult.score}</div>
                  <div className="uppercase tracking-wide text-sm font-semibold text-muted-foreground">{gidsResult.interpretation}</div>
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
                  <CardDescription>Calculo em mcg/kg/min</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Peso (kg)</Label>
                  <Input type="number" value={dvaWeight} onChange={e => setDvaWeight(e.target.value)} />
                  <Label>Velocidade (ml/h)</Label>
                  <Input type="number" value={norRate} onChange={e => setNorRate(e.target.value)} />
                  <Label>Diluicao: Volume Total (ml)</Label>
                  <Input type="number" value={norDilution} onChange={e => setNorDilution(e.target.value)} />
                  <Label>Numero de Ampolas (4mg)</Label>
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
                  <CardDescription>Calculo em UI/min (Sem peso)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Velocidade (ml/h)</Label>
                  <Input type="number" value={vasoRate} onChange={e => setVasoRate(e.target.value)} />
                  <Label>Diluicao: Volume Total (ml)</Label>
                  <Input type="number" value={vasoDilution} onChange={e => setVasoDilution(e.target.value)} />
                  <Label>Numero de Ampolas (20 UI)</Label>
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
              <CardHeader><CardTitle>NRS 2002</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 border p-3 rounded">
                    <p className="font-semibold text-sm">Triagem Inicial</p>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ1} onCheckedChange={v => setNrsQ1(!!v)} /> IMC &lt; 20.5?</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ2} onCheckedChange={v => setNrsQ2(!!v)} /> Perda de peso nos ultimos 3 meses?</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ3} onCheckedChange={v => setNrsQ3(!!v)} /> Reducao da ingestao na ultima semana?</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ4} onCheckedChange={v => setNrsQ4(!!v)} /> Paciente gravemente doente?</label>
                  </div>
                  <div className="space-y-2 border p-3 rounded">
                    <p className="font-semibold text-sm">Pontuacao Final</p>
                    <Label>Idade</Label>
                    <Input type="number" value={nrsAge} onChange={e => setNrsAge(e.target.value)} />
                    <Label>Escore Nutricional (0-3)</Label>
                    <Input type="number" value={nrsNutritionScore} onChange={e => setNrsNutritionScore(e.target.value)} />
                    <Label>Escore Gravidade (0-3)</Label>
                    <Input type="number" value={nrsDiseaseScore} onChange={e => setNrsDiseaseScore(e.target.value)} />
                  </div>
                </div>
                <div className="p-4 bg-muted text-center rounded">
                  <div className="text-xl font-bold">{nrsResult.score} pontos</div>
                  <div>{nrsResult.message}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === CATALOG TAB === */}
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
              <h3 className="font-bold mb-4">Links Uteis</h3>
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
