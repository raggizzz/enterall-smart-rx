import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Calculator, ChevronRight } from "lucide-react";
import {
  parenteralAminoacidsFromMl,
  parenteralGlucoseFromMl,
  parenteralLipidsFromMl,
} from "@/lib/prescriptionCalculations";
import type { Patient } from "@/lib/database";

export type GlucoseConcentration = 5 | 10 | 50;
export type LipidType = "tcm-tcl" | "complex-fish-oil";

export interface ParenteralValues {
  aminoacidsMl: number;
  lipidsMl: number;
  lipidType: LipidType;
  glucoseMl: number;
  glucoseConc: GlucoseConcentration;
  multivitamin: boolean;
  traceElements: boolean;
  access: 'central' | 'peripheral' | 'picc';
  infusionTime: number;
  observations: string;
}

export interface ParenteralDerived {
  aminoacidsG: number;
  aminoacidsKcal: number;
  lipidsG: number;
  lipidsKcal: number;
  glucoseG: number;
  glucoseKcal: number;
  vet: number;
  perKg: {
    kcal: number;
    amino: number;
    lipids: number;
    glucose: number;
    tig: number;
  };
}

export const deriveParenteralValues = (
  values: ParenteralValues,
  weight?: number | null,
): ParenteralDerived => {
  const aa = parenteralAminoacidsFromMl(values.aminoacidsMl, 10);
  const lip = parenteralLipidsFromMl(values.lipidsMl, 20);
  const glu = parenteralGlucoseFromMl(values.glucoseMl, values.glucoseConc);
  const vet = aa.kcal + lip.kcal + glu.kcal;
  const w = weight || 0;

  return {
    aminoacidsG: aa.g,
    aminoacidsKcal: aa.kcal,
    lipidsG: lip.g,
    lipidsKcal: lip.kcal,
    glucoseG: glu.g,
    glucoseKcal: glu.kcal,
    vet,
    perKg: {
      kcal: w ? vet / w : 0,
      amino: w ? aa.g / w : 0,
      lipids: w ? lip.g / w : 0,
      glucose: w ? glu.g / w : 0,
      tig: w && values.infusionTime > 0
        ? (glu.g * 1000) / (w * 60 * values.infusionTime)
        : 0,
    },
  };
};

interface Props {
  values: ParenteralValues;
  selectedPatient: Patient | null;
  onValuesChange: (v: Partial<ParenteralValues>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ParenteralStep({ values, selectedPatient, onValuesChange, onBack, onNext }: Props) {
  const derived = useMemo(
    () => deriveParenteralValues(values, selectedPatient?.weight),
    [values, selectedPatient?.weight],
  );

  return (
    <div className="space-y-6">
      {/* Resumo da Prescrição */}
      <Card className="border-2 border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-orange-700">
            <Calculator className="h-5 w-5" />Resumo da Prescrição Parenteral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-orange-600">{derived.vet.toFixed(0)}</div>
              <div className="text-xs text-muted-foreground">kcal/dia</div>
              {derived.perKg.kcal > 0 && <div className="text-sm font-semibold text-orange-700">{derived.perKg.kcal.toFixed(1)} kcal/kg</div>}
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{derived.aminoacidsG.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">g aminoácidos/dia</div>
              {derived.perKg.amino > 0 && <div className="text-sm font-semibold text-blue-700">{derived.perKg.amino.toFixed(2)} g/kg</div>}
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-amber-600">{derived.lipidsG.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">g lipídeos/dia</div>
              {derived.perKg.lipids > 0 && <div className="text-sm font-semibold text-amber-700">{derived.perKg.lipids.toFixed(2)} g/kg</div>}
            </div>
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="text-2xl font-bold text-green-600">{derived.glucoseG.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">g glicose/dia</div>
              {derived.perKg.glucose > 0 && <div className="text-sm font-semibold text-green-700">{derived.perKg.glucose.toFixed(2)} g/kg</div>}
            </div>
          </div>
          {selectedPatient?.weight && (
            <div className="rounded-lg border border-orange-200 bg-white/80 px-4 py-3 text-sm">
              <span className="font-semibold text-orange-700">TIG:</span> {derived.perKg.tig.toFixed(2)} mg/kg/min
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
            onValueChange={(v) => onValuesChange({ access: v as 'central' | 'peripheral' | 'picc' })}
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
              onChange={e => onValuesChange({ infusionTime: parseInt(e.target.value) || 24 })}
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
        <CardHeader>
          <CardTitle>Composição da NP</CardTitle>
          <CardDescription>Entrada em ml — o sistema converte automaticamente para gramas e kcal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aminoácidos */}
            <div className="space-y-2 p-4 rounded-lg border bg-blue-50/50">
              <Label className="text-blue-700 font-semibold">Aminoácidos (concentração fixa 10%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="1"
                  value={values.aminoacidsMl || ''}
                  onChange={e => onValuesChange({ aminoacidsMl: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 800"
                />
                <span className="text-sm whitespace-nowrap font-medium">ml</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>= <strong>{derived.aminoacidsG.toFixed(1)}</strong> g ({derived.perKg.amino > 0 ? `${derived.perKg.amino.toFixed(2)} g/kg` : '—'})</p>
                <p>= <strong>{derived.aminoacidsKcal.toFixed(0)}</strong> kcal</p>
              </div>
            </div>

            {/* Glicose */}
            <div className="space-y-2 p-4 rounded-lg border bg-green-50/50">
              <Label className="text-green-700 font-semibold">Glicose</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={String(values.glucoseConc)}
                  onValueChange={v => onValuesChange({ glucoseConc: parseInt(v) as GlucoseConcentration })}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number" step="1"
                  value={values.glucoseMl || ''}
                  onChange={e => onValuesChange({ glucoseMl: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 500"
                />
                <span className="text-sm whitespace-nowrap font-medium">ml</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>= <strong>{derived.glucoseG.toFixed(1)}</strong> g ({derived.perKg.glucose > 0 ? `${derived.perKg.glucose.toFixed(2)} g/kg` : '—'})</p>
                <p>= <strong>{derived.glucoseKcal.toFixed(0)}</strong> kcal</p>
              </div>
            </div>

            {/* Lipídeos */}
            <div className="space-y-2 p-4 rounded-lg border bg-amber-50/50">
              <Label className="text-amber-700 font-semibold">Lipídeos (concentração fixa 20%)</Label>
              <Select
                value={values.lipidType}
                onValueChange={v => onValuesChange({ lipidType: v as LipidType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tcm-tcl">TCM/TCL</SelectItem>
                  <SelectItem value="complex-fish-oil">Lipídeos complexos com óleo de peixe</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="number" step="1"
                  value={values.lipidsMl || ''}
                  onChange={e => onValuesChange({ lipidsMl: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 250"
                />
                <span className="text-sm whitespace-nowrap font-medium">ml</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>= <strong>{derived.lipidsG.toFixed(1)}</strong> g ({derived.perKg.lipids > 0 ? `${derived.perKg.lipids.toFixed(2)} g/kg` : '—'})</p>
                <p>= <strong>{derived.lipidsKcal.toFixed(0)}</strong> kcal</p>
              </div>
            </div>

            {/* TIG */}
            <div className="space-y-2 p-4 rounded-lg border">
              <Label>TIG (mg/kg/min)</Label>
              <Input
                type="number"
                value={selectedPatient?.weight ? derived.perKg.tig.toFixed(2) : ''}
                readOnly
                placeholder="Informe o peso do paciente"
              />
              <p className="text-xs text-muted-foreground">Cálculo: glicose (g/dia) × 1000 / peso / 60 / horas de infusão</p>
            </div>
          </div>

          {/* Checkboxes extras */}
          <div className="flex flex-wrap gap-6 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <Checkbox
                id="pn-multivitamin"
                checked={values.multivitamin}
                onCheckedChange={checked => onValuesChange({ multivitamin: !!checked })}
              />
              <Label htmlFor="pn-multivitamin" className="cursor-pointer font-medium">Multivitamínico</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="pn-trace-elements"
                checked={values.traceElements}
                onCheckedChange={checked => onValuesChange({ traceElements: !!checked })}
              />
              <Label htmlFor="pn-trace-elements" className="cursor-pointer font-medium">Oligoelementos</Label>
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
            onChange={e => onValuesChange({ observations: e.target.value })}
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
