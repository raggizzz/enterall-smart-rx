import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Calculator, ChevronRight } from "lucide-react";
import type { Patient } from "@/lib/database";

interface ParenteralValues {
  aminoacids: number;
  lipids: number;
  glucose: number;
  access: 'central' | 'peripheral' | 'picc';
  infusionTime: number;
  observations: string;
  vet: number;
  perKg: {
    kcal: number;
    amino: number;
    lipids: number;
    glucose: number;
    tig: number;
  };
}

interface Props {
  values: ParenteralValues;
  selectedPatient: Patient | null;
  onAminoacidsChange: (v: number) => void;
  onLipidsChange: (v: number) => void;
  onGlucoseChange: (v: number) => void;
  onAccessChange: (v: 'central' | 'peripheral' | 'picc') => void;
  onInfusionTimeChange: (v: number) => void;
  onObservationsChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ParenteralStep({ values, selectedPatient, onAminoacidsChange, onLipidsChange, onGlucoseChange, onAccessChange, onInfusionTimeChange, onObservationsChange, onBack, onNext }: Props) {
  return (
    <div className="space-y-6">
      {/* Resumo da Prescrição */}
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-violet-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Calculator className="h-5 w-5" />Resumo da Prescrição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{values.vet.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">kcal/dia</div>
              {values.perKg.kcal > 0 && <div className="text-sm font-semibold text-purple-700">{values.perKg.kcal.toFixed(1)} kcal/kg</div>}
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{values.aminoacids.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">g aminoácidos/dia</div>
              {values.perKg.amino > 0 && <div className="text-sm font-semibold text-blue-700">{values.perKg.amino.toFixed(2)} g/kg</div>}
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-amber-600">{values.lipids.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">g lipídeos/dia</div>
              {values.perKg.lipids > 0 && <div className="text-sm font-semibold text-amber-700">{values.perKg.lipids.toFixed(2)} g/kg</div>}
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">{values.glucose.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">g glicose/dia</div>
              {values.perKg.glucose > 0 && <div className="text-sm font-semibold text-green-700">{values.perKg.glucose.toFixed(2)} g/kg</div>}
            </div>
          </div>
          {selectedPatient?.weight && (
            <div className="rounded-lg border border-purple-200 bg-white/80 px-4 py-3 text-sm">
              <span className="font-semibold text-purple-700">TIG:</span> {values.perKg.tig.toFixed(2)} mg/kg/min
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acesso Venoso */}
      <Card>
        <CardHeader><CardTitle>Acesso Venoso</CardTitle></CardHeader>
        <CardContent>
          <RadioGroup
            value={values.access}
            onValueChange={(v) => onAccessChange(v as 'central' | 'peripheral' | 'picc')}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="central" id="pn-central" />
              <Label htmlFor="pn-central" className="cursor-pointer"><Badge variant="default">Central</Badge></Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="peripheral" id="pn-peripheral" />
              <Label htmlFor="pn-peripheral" className="cursor-pointer"><Badge variant="secondary">Periférico</Badge></Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="picc" id="pn-picc" />
              <Label htmlFor="pn-picc" className="cursor-pointer"><Badge variant="outline">PICC</Badge></Label>
            </div>
          </RadioGroup>
          {values.access === 'peripheral' && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Atenção: Acesso periférico limita osmolaridade da solução</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tempo de Infusão */}
      <Card>
        <CardHeader>
          <CardTitle>Tempo de Infusão da Bolsa</CardTitle>
          <CardDescription>Defina o tempo total de infusão da bolsa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="number" min="1" max="24"
              value={values.infusionTime}
              onChange={e => onInfusionTimeChange(parseInt(e.target.value) || 24)}
              className="w-24"
            />
            <span className="text-lg">horas</span>
            {values.infusionTime === 24 && <Badge variant="secondary">Infusão contínua</Badge>}
            {values.infusionTime < 24 && values.infusionTime > 0 && <Badge variant="outline">Infusão cíclica</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Composição da NP */}
      <Card>
        <CardHeader><CardTitle>Composição da NP</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>VET (kcal/dia)</Label>
              <Input type="number" value={values.vet ? values.vet.toFixed(0) : ''} readOnly placeholder="Calculado automaticamente" />
              <p className="text-xs text-muted-foreground">Cálculo automático: aminoácidos x 4 + lipídeos x 9 + glicose x 3.4</p>
              {selectedPatient?.weight && <p className="text-xs text-muted-foreground">= {values.perKg.kcal.toFixed(1)} kcal/kg</p>}
            </div>
            <div className="space-y-2">
              <Label>Aminoácidos (g/dia)</Label>
              <Input type="number" step="0.1" value={values.aminoacids || ''} onChange={e => onAminoacidsChange(parseFloat(e.target.value) || 0)} placeholder="Ex: 80" />
              {selectedPatient?.weight && <p className="text-xs text-muted-foreground">= {values.perKg.amino.toFixed(2)} g/kg</p>}
            </div>
            <div className="space-y-2">
              <Label>Lipídeos (g/dia)</Label>
              <Input type="number" step="0.1" value={values.lipids || ''} onChange={e => onLipidsChange(parseFloat(e.target.value) || 0)} placeholder="Ex: 60" />
              {selectedPatient?.weight && <p className="text-xs text-muted-foreground">= {values.perKg.lipids.toFixed(2)} g/kg</p>}
            </div>
            <div className="space-y-2">
              <Label>Glicose (g/dia)</Label>
              <Input type="number" step="1" value={values.glucose || ''} onChange={e => onGlucoseChange(parseFloat(e.target.value) || 0)} placeholder="Ex: 200" />
              {selectedPatient?.weight && <p className="text-xs text-muted-foreground">= {values.perKg.glucose.toFixed(2)} g/kg</p>}
            </div>
            <div className="space-y-2">
              <Label>TIG (mg/kg/min)</Label>
              <Input type="number" value={selectedPatient?.weight ? values.perKg.tig.toFixed(2) : ''} readOnly placeholder="Informe o peso do paciente" />
              <p className="text-xs text-muted-foreground">Calculo: glicose (g/dia) x 1000 / peso / 60 / horas de infusao</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader><CardTitle>Observações</CardTitle></CardHeader>
        <CardContent>
          <Textarea
            value={values.observations}
            onChange={e => onObservationsChange(e.target.value)}
            placeholder="Anotações sobre a prescrição parenteral..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
        <Button onClick={onNext}>Próximo <ChevronRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </div>
  );
}
