import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Brain, ArrowLeft, Sparkles, AlertCircle, CheckCircle, Lightbulb, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { generateNutritionRecommendation, PatientData } from "@/lib/aiRecommendationEngine";
import { generateMLRecommendation } from "@/lib/mlRecommendations";

const AIRecommendations = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [patientData, setPatientData] = useState<Partial<PatientData>>({
    age: 65,
    weight: 70,
    height: 170,
    diagnosis: "",
    comorbidities: [],
    administrationRoute: "enteral",
    restrictions: [],
    clinicalCondition: "moderate",
    renalFunction: "normal",
    hepaticFunction: "normal",
    diabetic: false,
    allergies: [],
    currentWeight: 70,
    idealWeight: 70,
    stressLevel: "moderate",
  });

  const [aiRecommendation, setAiRecommendation] = useState<any>(null);
  const [mlRecommendation, setMlRecommendation] = useState<any>(null);

  const handleGenerateRecommendation = () => {
    if (!patientData.diagnosis) {
      toast.error("Por favor, preencha o diagnóstico do paciente");
      return;
    }

    setLoading(true);
    try {
      const aiRec = generateNutritionRecommendation(patientData as PatientData);
      setAiRecommendation(aiRec);

      const mlRec = generateMLRecommendation({
        age: patientData.age!,
        weight: patientData.weight!,
        height: patientData.height!,
        diagnosis: patientData.diagnosis!,
        comorbidities: patientData.comorbidities!,
        administrationRoute: patientData.administrationRoute!,
      });
      setMlRecommendation(mlRec);

      toast.success("Recomendações geradas com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar recomendações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
                Recomendações com IA
              </h1>
              <p className="text-muted-foreground">Sistema inteligente de recomendações nutricionais</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Dados do Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Idade (anos)</Label>
                <Input type="number" value={patientData.age} onChange={(e) => setPatientData({ ...patientData, age: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input type="number" value={patientData.weight} onChange={(e) => setPatientData({ ...patientData, weight: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Altura (cm)</Label>
                <Input type="number" value={patientData.height} onChange={(e) => setPatientData({ ...patientData, height: parseFloat(e.target.value) })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Diagnóstico *</Label>
                <Select value={patientData.diagnosis} onValueChange={(value) => setPatientData({ ...patientData, diagnosis: value })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sepsis">Sepse</SelectItem>
                    <SelectItem value="pneumonia">Pneumonia</SelectItem>
                    <SelectItem value="stroke">AVC</SelectItem>
                    <SelectItem value="trauma">Trauma</SelectItem>
                    <SelectItem value="cancer">Câncer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Via de Administração</Label>
                <Select value={patientData.administrationRoute} onValueChange={(value: any) => setPatientData({ ...patientData, administrationRoute: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oral">Oral</SelectItem>
                    <SelectItem value="enteral">Enteral</SelectItem>
                    <SelectItem value="parenteral">Parenteral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleGenerateRecommendation} disabled={loading} className="w-full">
              {loading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Gerando...</> : <><Brain className="h-4 w-4 mr-2" />Gerar Recomendações</>}
            </Button>
          </CardContent>
        </Card>

        {aiRecommendation && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Recomendação Nutricional IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Confiança</span>
                <Badge>{aiRecommendation.confidence}%</Badge>
              </div>
              <Progress value={aiRecommendation.confidence} />

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Calorias</p>
                  <p className="text-2xl font-bold text-primary">{aiRecommendation.totalCalories}</p>
                  <p className="text-xs">kcal/dia</p>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Proteínas</p>
                  <p className="text-2xl font-bold text-primary">{aiRecommendation.totalProtein}</p>
                  <p className="text-xs">g/dia</p>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Cal/kg</p>
                  <p className="text-2xl font-bold text-primary">{aiRecommendation.caloriesPerKg}</p>
                </div>
                <div className="text-center p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm text-muted-foreground">Prot/kg</p>
                  <p className="text-2xl font-bold text-primary">{aiRecommendation.proteinPerKg}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Justificativa:
                </h4>
                <ul className="space-y-2">
                  {aiRecommendation.rationale.map((item: string, i: number) => (
                    <li key={i} className="text-sm flex gap-2"><span className="text-primary">•</span><span>{item}</span></li>
                  ))}
                </ul>
              </div>

              {aiRecommendation.warnings.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-orange-600">
                    <AlertCircle className="h-4 w-4" />
                    Alertas:
                  </h4>
                  <ul className="space-y-2">
                    {aiRecommendation.warnings.map((w: string, i: number) => (
                      <li key={i} className="text-sm flex gap-2"><span className="text-orange-600">⚠</span><span>{w}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AIRecommendations;
