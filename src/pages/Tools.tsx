import { useMemo, useState } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useAppTools } from "@/hooks/useDatabase";

const numberOrZero = (value: string): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const TOOLS_FALLBACK = [
  { code: "PESO_ALTURA", name: "Estimativa de peso e altura", category: "antropometria" },
  { code: "GIDS", name: "Escore GIDS", category: "triagem" },
  { code: "DVA", name: "Dose de drogas vasoativas", category: "critico" },
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
];

type GidsMildKey =
  | "absentBowelSounds"
  | "vomiting"
  | "residualVolume"
  | "ileus"
  | "distension"
  | "mildDiarrhea"
  | "giBleedNoTransfusion"
  | "pia12to20";

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

  // Peso e altura
  const [phSex, setPhSex] = useState<"male" | "female">("male");
  const [phEthnicity, setPhEthnicity] = useState<"white" | "black">("white");
  const [phAge, setPhAge] = useState("60");
  const [phKneeHeight, setPhKneeHeight] = useState("");
  const [phArmCirc, setPhArmCirc] = useState("");

  const anthropometry = useMemo(() => {
    const age = numberOrZero(phAge);
    const knee = numberOrZero(phKneeHeight);
    const arm = numberOrZero(phArmCirc);

    let estHeightCm = 0;
    if (phSex === "male" && phEthnicity === "white") estHeightCm = 71.85 + 1.88 * knee;
    if (phSex === "male" && phEthnicity === "black") estHeightCm = 73.42 + 1.79 * knee;
    if (phSex === "female" && phEthnicity === "white") estHeightCm = 70.25 + 1.87 * knee - 0.06 * age;
    if (phSex === "female" && phEthnicity === "black") estHeightCm = 68.1 + 1.86 * knee - 0.06 * age;

    let estWeightKg = 0;
    if (phSex === "male" && phEthnicity === "white") estWeightKg = 1.19 * knee + 3.21 * arm - 86.82;
    if (phSex === "male" && phEthnicity === "black") estWeightKg = 1.09 * knee + 3.14 * arm - 83.72;
    if (phSex === "female" && phEthnicity === "white") estWeightKg = 1.01 * knee + 2.81 * arm - 66.04;
    if (phSex === "female" && phEthnicity === "black") estWeightKg = 1.24 * knee + 2.97 * arm - 82.48;

    return {
      estHeightCm: Math.max(0, Number(estHeightCm.toFixed(1))),
      estHeightM: Math.max(0, Number((estHeightCm / 100).toFixed(2))),
      estWeightKg: Math.max(0, Number(estWeightKg.toFixed(1))),
    };
  }, [phSex, phEthnicity, phAge, phKneeHeight, phArmCirc]);

  // GIDS
  const [gidsOralDiet, setGidsOralDiet] = useState(true);
  const [gidsMild, setGidsMild] = useState<Record<GidsMildKey, boolean>>({
    absentBowelSounds: false,
    vomiting: false,
    residualVolume: false,
    ileus: false,
    distension: false,
    mildDiarrhea: false,
    giBleedNoTransfusion: false,
    pia12to20: false,
  });
  const [gidsSevere, setGidsSevere] = useState<Record<GidsSevereKey, boolean>>({
    severeDiarrhea: false,
    giBleedWithTransfusion: false,
    prokinetics: false,
    piaAbove20: false,
  });
  const [gidsThreatening, setGidsThreatening] = useState<Record<GidsThreateningKey, boolean>>({
    hemorrhagicShock: false,
    mesentericIschemia: false,
    abdominalCompartment: false,
  });

  const gidsResult = useMemo(() => {
    const mildCount = Object.values(gidsMild).filter(Boolean).length;
    const severeCount = Object.values(gidsSevere).filter(Boolean).length;
    const threateningCount = Object.values(gidsThreatening).filter(Boolean).length;

    let score = 0;
    let interpretation = "Sem risco";

    if (threateningCount > 0) {
      score = 4;
      interpretation = "Ameaca a vida";
    } else if (severeCount >= 3) {
      score = 3;
      interpretation = "Falencia do trato gastrointestinal";
    } else if ((!gidsOralDiet && mildCount >= 2) || (severeCount >= 1 && severeCount <= 2)) {
      score = 2;
      interpretation = "Disfuncao do trato gastrointestinal";
    } else if (!gidsOralDiet && mildCount >= 1 && mildCount <= 2) {
      score = 1;
      interpretation = "Risco aumentado";
    } else if (gidsOralDiet && mildCount <= 1) {
      score = 0;
      interpretation = "Sem risco";
    }

    return { score, interpretation };
  }, [gidsMild, gidsOralDiet, gidsSevere, gidsThreatening]);

  // DVA
  const [dvaWeight, setDvaWeight] = useState("50");
  const [norRate, setNorRate] = useState("15");
  const [norDilution, setNorDilution] = useState("200");
  const [norAmpoules, setNorAmpoules] = useState("4");
  const [vasoRate, setVasoRate] = useState("2");
  const [vasoDilution, setVasoDilution] = useState("100");
  const [vasoAmpoules, setVasoAmpoules] = useState("1");

  const dvaResult = useMemo(() => {
    const weight = numberOrZero(dvaWeight);

    const norDoseMcgKgMin =
      weight > 0
        ? ((numberOrZero(norAmpoules) * 4 * 1 * 1000) / numberOrZero(norDilution)) *
          (numberOrZero(norRate) / 60) /
          weight
        : 0;

    const vasoDoseUiMin =
      ((numberOrZero(vasoAmpoules) * 2 * 20) / numberOrZero(vasoDilution)) *
      (numberOrZero(vasoRate) / 60);

    return {
      norDoseMcgKgMin: Number(norDoseMcgKgMin.toFixed(2)),
      vasoDoseUiMin: Number(vasoDoseUiMin.toFixed(2)),
    };
  }, [dvaWeight, norAmpoules, norDilution, norRate, vasoAmpoules, vasoDilution, vasoRate]);

  // NRS
  const [nrsQ1, setNrsQ1] = useState(false);
  const [nrsQ2, setNrsQ2] = useState(false);
  const [nrsQ3, setNrsQ3] = useState(false);
  const [nrsQ4, setNrsQ4] = useState(false);
  const [nrsAge, setNrsAge] = useState("65");
  const [nrsNutritionScore, setNrsNutritionScore] = useState("0");
  const [nrsDiseaseScore, setNrsDiseaseScore] = useState("0");

  const nrsResult = useMemo(() => {
    const firstStagePositive = nrsQ1 || nrsQ2 || nrsQ3 || nrsQ4;
    if (!firstStagePositive) {
      return {
        score: 0,
        message: "Sem risco nutricional. Repetir triagem em 7 dias.",
      };
    }

    const ageScore = numberOrZero(nrsAge) >= 70 ? 1 : 0;
    const total = numberOrZero(nrsNutritionScore) + numberOrZero(nrsDiseaseScore) + ageScore;
    return {
      score: total,
      message:
        total >= 3
          ? "RISCO NUTRICIONAL. Proceder com avaliacao e planejamento da terapia nutricional."
          : "Sem risco nutricional. Repetir triagem em 7 dias.",
    };
  }, [nrsQ1, nrsQ2, nrsQ3, nrsQ4, nrsAge, nrsNutritionScore, nrsDiseaseScore]);

  // Balanco nitrogenado
  const [bnProteinIntake, setBnProteinIntake] = useState("");
  const [bnUrinaryUrea, setBnUrinaryUrea] = useState("");
  const [bnBowelFunction, setBnBowelFunction] = useState("normal");

  const bnResult = useMemo(() => {
    const protein = numberOrZero(bnProteinIntake);
    const urea = numberOrZero(bnUrinaryUrea);
    const extraLossesMap: Record<string, number> = { diarrhea: 5, normal: 4, constipation: 3, fistula: 8 };
    const extraLosses = extraLossesMap[bnBowelFunction] ?? 4;
    const nitrogenIntake = protein / 6.25;
    const urinaryNitrogenLoss = urea / 2.14;
    const totalLosses = urinaryNitrogenLoss + extraLosses;
    const balance = nitrogenIntake - totalLosses;

    return {
      nitrogenIntake: Number(nitrogenIntake.toFixed(2)),
      totalLosses: Number(totalLosses.toFixed(2)),
      balance: Number(balance.toFixed(2)),
    };
  }, [bnProteinIntake, bnUrinaryUrea, bnBowelFunction]);

  // Gasto energetico
  const [geAge, setGeAge] = useState("60");
  const [geWeight, setGeWeight] = useState("70");
  const [geHeightM, setGeHeightM] = useState("1.70");
  const [geSex, setGeSex] = useState<"male" | "female">("male");
  const [gePocket, setGePocket] = useState("25");

  const geResult = useMemo(() => {
    const age = numberOrZero(geAge);
    const weight = numberOrZero(geWeight);
    const heightM = numberOrZero(geHeightM);
    const heightCm = heightM * 100;
    const pocket = numberOrZero(gePocket);

    const ireton =
      geSex === "male"
        ? 1784 + 5 * weight - 11 * age + 244
        : 1784 + 5 * weight - 11 * age;
    const harris =
      geSex === "male"
        ? weight * 13.75 + heightCm * 5 - age * 6.75 + 66.5
        : weight * 9.5 + heightCm * 1.84 - age * 4.67 + 655;
    const pocketValue = weight * pocket;

    return {
      ireton: Math.round(ireton),
      harris: Math.round(harris),
      pocketValue: Math.round(pocketValue),
    };
  }, [geAge, geHeightM, gePocket, geSex, geWeight]);

  // GLIM
  const [glimReducedIntake, setGlimReducedIntake] = useState(false);
  const [glimInflammation, setGlimInflammation] = useState(false);
  const [glimWeightLoss, setGlimWeightLoss] = useState<"none" | "moderate" | "severe">("none");
  const [glimMuscleLoss, setGlimMuscleLoss] = useState<"none" | "moderate" | "severe">("none");
  const [glimBmi, setGlimBmi] = useState<"none" | "moderate" | "severe">("none");
  const [glimDisease, setGlimDisease] = useState("cronica_com_inflamacao");

  const glimResult = useMemo(() => {
    const etiologicPositive = glimReducedIntake || glimInflammation;
    const phenotypicItems = [glimWeightLoss, glimMuscleLoss, glimBmi];
    const phenotypicPositive = phenotypicItems.some((x) => x !== "none");

    if (!etiologicPositive || !phenotypicPositive) {
      return "Nao desnutrido";
    }

    const severe = phenotypicItems.some((x) => x === "severe");
    const severity = severe ? "Desnutricao grave" : "Desnutricao moderada";
    const diseaseMap: Record<string, string> = {
      cronica_com_inflamacao: "relacionada a doenca cronica com inflamacao",
      cronica_minima: "relacionada a doenca cronica com inflamacao minima",
      aguda_grave: "relacionada a doenca aguda ou injuria com inflamacao grave",
      social_ambiental: "relacionada a circunstancias sociais ou ambientais",
    };

    return `${severity} ${diseaseMap[glimDisease] || ""}`.trim();
  }, [glimReducedIntake, glimInflammation, glimWeightLoss, glimMuscleLoss, glimBmi, glimDisease]);

  const toolsCatalog = tools.length > 0 ? tools : TOOLS_FALLBACK;
  const linksCatalog = tools.filter((tool) => tool.link).map((tool) => ({ name: tool.name, link: tool.link as string }));
  const linksToShow = linksCatalog.length > 0 ? linksCatalog : LINKS_FALLBACK;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-secondary/35 to-background pb-20">
      <Header />
      <div className="container px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ferramentas Clinicas</h1>
          <p className="text-muted-foreground">
            Implementado conforme planilha Ferramentas do app e observacoes funcionais.
          </p>
        </div>

        <Tabs defaultValue="calculadoras" className="space-y-4">
          <TabsList className="border border-border/70 bg-card/80">
            <TabsTrigger value="calculadoras">Calculadoras</TabsTrigger>
            <TabsTrigger value="links">Links uteis</TabsTrigger>
            <TabsTrigger value="catalogo">Catalogo</TabsTrigger>
          </TabsList>

          <TabsContent value="calculadoras" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Peso e Altura Estimados</CardTitle>
                <CardDescription>Base Chumlea (altura do joelho, idade e circunferencia do braco).</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select value={phSex} onValueChange={(v: "male" | "female") => setPhSex(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Homem</SelectItem>
                      <SelectItem value="female">Mulher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Etnia</Label>
                  <Select value={phEthnicity} onValueChange={(v: "white" | "black") => setPhEthnicity(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="white">Branco</SelectItem>
                      <SelectItem value="black">Negro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Idade (anos)</Label>
                  <Input type="number" value={phAge} onChange={(e) => setPhAge(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Altura do joelho (cm)</Label>
                  <Input type="number" value={phKneeHeight} onChange={(e) => setPhKneeHeight(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Circunferencia de braco (cm)</Label>
                  <Input type="number" value={phArmCirc} onChange={(e) => setPhArmCirc(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Resultado</Label>
                  <div className="p-3 border rounded-md text-sm space-y-1">
                    <div>Estatura estimada: <strong>{anthropometry.estHeightM} m</strong></div>
                    <div>Peso estimado: <strong>{anthropometry.estWeightKg} kg</strong></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>GIDS</CardTitle>
                <CardDescription>Escore de disfuncao gastrointestinal (iSOFA).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox checked={gidsOralDiet} onCheckedChange={(v) => setGidsOralDiet(Boolean(v))} />
                  <Label>Paciente com dieta oral</Label>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Sintomas leves</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {GIDS_MILD_OPTIONS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={gidsMild[key]}
                          onCheckedChange={(v) => setGidsMild((prev) => ({ ...prev, [key]: Boolean(v) }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Sintomas graves</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {GIDS_SEVERE_OPTIONS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={gidsSevere[key]}
                          onCheckedChange={(v) => setGidsSevere((prev) => ({ ...prev, [key]: Boolean(v) }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Condicoes ameacadoras</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {GIDS_THREAT_OPTIONS.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={gidsThreatening[key]}
                          onCheckedChange={(v) => setGidsThreatening((prev) => ({ ...prev, [key]: Boolean(v) }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-3 border rounded-md">
                  <p className="text-sm">Resultado: <strong>{gidsResult.score}</strong></p>
                  <p className="text-sm">Interpretacao: <strong>{gidsResult.interpretation}</strong></p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Doses de DVA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Peso (kg)</Label>
                  <Input type="number" value={dvaWeight} onChange={(e) => setDvaWeight(e.target.value)} />

                  <Label>Noradrenalina - Velocidade (ml/h)</Label>
                  <Input type="number" value={norRate} onChange={(e) => setNorRate(e.target.value)} />
                  <Label>Noradrenalina - Soro (ml)</Label>
                  <Input type="number" value={norDilution} onChange={(e) => setNorDilution(e.target.value)} />
                  <Label>Noradrenalina - Ampolas</Label>
                  <Input type="number" value={norAmpoules} onChange={(e) => setNorAmpoules(e.target.value)} />

                  <Label>Vasopressina - Velocidade (ml/h)</Label>
                  <Input type="number" value={vasoRate} onChange={(e) => setVasoRate(e.target.value)} />
                  <Label>Vasopressina - Soro (ml)</Label>
                  <Input type="number" value={vasoDilution} onChange={(e) => setVasoDilution(e.target.value)} />
                  <Label>Vasopressina - Ampolas</Label>
                  <Input type="number" value={vasoAmpoules} onChange={(e) => setVasoAmpoules(e.target.value)} />

                  <div className="p-3 border rounded-md text-sm">
                    <div>Noradrenalina: <strong>{dvaResult.norDoseMcgKgMin} mcg/kg/min</strong></div>
                    <div>Vasopressina: <strong>{dvaResult.vasoDoseUiMin} UI/min</strong></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>NRS 2002</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ1} onCheckedChange={(v) => setNrsQ1(Boolean(v))} /> IMC menor que 20.5</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ2} onCheckedChange={(v) => setNrsQ2(Boolean(v))} /> Perda de peso em 3 meses</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ3} onCheckedChange={(v) => setNrsQ3(Boolean(v))} /> Ingestao reduzida na ultima semana</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={nrsQ4} onCheckedChange={(v) => setNrsQ4(Boolean(v))} /> Gravemente doente</label>
                  </div>

                  <Label>Idade</Label>
                  <Input type="number" value={nrsAge} onChange={(e) => setNrsAge(e.target.value)} />
                  <Label>Escore estado nutricional (0-3)</Label>
                  <Input type="number" min={0} max={3} value={nrsNutritionScore} onChange={(e) => setNrsNutritionScore(e.target.value)} />
                  <Label>Escore gravidade da doenca (0-3)</Label>
                  <Input type="number" min={0} max={3} value={nrsDiseaseScore} onChange={(e) => setNrsDiseaseScore(e.target.value)} />

                  <div className="p-3 border rounded-md text-sm">
                    <div>Escore total: <strong>{nrsResult.score}</strong></div>
                    <div>{nrsResult.message}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Balanco Nitrogenado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Ingestao proteica em 24h (g)</Label>
                  <Input type="number" value={bnProteinIntake} onChange={(e) => setBnProteinIntake(e.target.value)} />
                  <Label>Ureia urinaria em 24h (g/dia)</Label>
                  <Input type="number" value={bnUrinaryUrea} onChange={(e) => setBnUrinaryUrea(e.target.value)} />
                  <Label>Funcao intestinal</Label>
                  <Select value={bnBowelFunction} onValueChange={setBnBowelFunction}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (+4)</SelectItem>
                      <SelectItem value="diarrhea">Diarreia (+5)</SelectItem>
                      <SelectItem value="constipation">Constipacao (+3)</SelectItem>
                      <SelectItem value="fistula">Fistula (+8)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="p-3 border rounded-md text-sm">
                    <div>Nitrogenio ingerido: <strong>{bnResult.nitrogenIntake} g</strong></div>
                    <div>Perdas totais: <strong>{bnResult.totalLosses} g</strong></div>
                    <div>Balanco: <strong>{bnResult.balance} g</strong></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Gasto Energetico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Label>Idade (anos)</Label>
                  <Input type="number" value={geAge} onChange={(e) => setGeAge(e.target.value)} />
                  <Label>Peso (kg)</Label>
                  <Input type="number" value={geWeight} onChange={(e) => setGeWeight(e.target.value)} />
                  <Label>Estatura (m)</Label>
                  <Input type="number" step="0.01" value={geHeightM} onChange={(e) => setGeHeightM(e.target.value)} />
                  <Label>Sexo</Label>
                  <Select value={geSex} onValueChange={(v: "male" | "female") => setGeSex(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>Formula de bolso (kcal/kg)</Label>
                  <Input type="number" value={gePocket} onChange={(e) => setGePocket(e.target.value)} />
                  <div className="p-3 border rounded-md text-sm space-y-1">
                    <div>Ireton Jones: <strong>{geResult.ireton} kcal/dia</strong></div>
                    <div>Harris-Benedict: <strong>{geResult.harris} kcal/dia</strong></div>
                    <div>Formula de bolso: <strong>{geResult.pocketValue} kcal/dia</strong></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>GLIM</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Dominio etiologico</p>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={glimReducedIntake} onCheckedChange={(v) => setGlimReducedIntake(Boolean(v))} /> Ingestao/assimilacao reduzida</label>
                  <label className="flex items-center gap-2 text-sm"><Checkbox checked={glimInflammation} onCheckedChange={(v) => setGlimInflammation(Boolean(v))} /> Presenca de inflamacao</label>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium">Dominio fenotipico</p>
                  <Label>Perda de peso</Label>
                  <Select value={glimWeightLoss} onValueChange={(v: "none" | "moderate" | "severe") => setGlimWeightLoss(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ausente</SelectItem>
                      <SelectItem value="moderate">Moderada</SelectItem>
                      <SelectItem value="severe">Grave</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>Perda de massa magra</Label>
                  <Select value={glimMuscleLoss} onValueChange={(v: "none" | "moderate" | "severe") => setGlimMuscleLoss(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ausente</SelectItem>
                      <SelectItem value="moderate">Moderada</SelectItem>
                      <SelectItem value="severe">Grave</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>IMC</Label>
                  <Select value={glimBmi} onValueChange={(v: "none" | "moderate" | "severe") => setGlimBmi(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Normal</SelectItem>
                      <SelectItem value="moderate">Moderado</SelectItem>
                      <SelectItem value="severe">Grave</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label>Relacionada a</Label>
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

                <div className="md:col-span-2 p-3 border rounded-md text-sm">
                  Diagnostico nutricional: <strong>{glimResult}</strong>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle>Links Uteis</CardTitle>
                <CardDescription>Base da planilha Ferramentas do app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {linksToShow.map((item) => (
                  <div key={item.link} className="p-3 border rounded-md">
                    <p className="text-sm font-medium">{item.name}</p>
                    <a href={item.link} target="_blank" rel="noreferrer" className="text-sm text-primary break-all">
                      {item.link}
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="catalogo">
            <Card>
              <CardHeader>
                <CardTitle>Catalogo de Ferramentas</CardTitle>
                <CardDescription>Ferramentas do banco (`app_tools`) com fallback da planilha.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {toolsCatalog.map((tool) => (
                  <div key={tool.code} className="p-3 border rounded-md flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{tool.name}</p>
                      <p className="text-xs text-muted-foreground">Codigo: {tool.code}</p>
                    </div>
                    <Badge variant="secondary">{tool.category}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Tools;
