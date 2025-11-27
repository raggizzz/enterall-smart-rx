import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import FormulaForm from "@/components/FormulaForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { getAllFormulas, getAllModules, searchFormulas } from "@/lib/formulasDatabase";

const Formulas = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewFormulaOpen, setIsNewFormulaOpen] = useState(false);

  const handleCreateFormula = (data: any) => {
    console.log("New Formula Data:", data);
    setIsNewFormulaOpen(false);
  };

  const allFormulas = getAllFormulas();
  const allModules = getAllModules();

  let filteredFormulas = allFormulas;
  if (searchQuery) {
    filteredFormulas = searchFormulas(searchQuery);
  }

  const openFormulas = filteredFormulas.filter(f => f.systemType === 'open' || f.systemType === 'both');
  const closedFormulas = filteredFormulas.filter(f => f.systemType === 'closed');

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Catálogo de Nutrição</h1>
            <p className="text-muted-foreground">Fórmulas Enterais e Módulos</p>
          </div>
          <Dialog open={isNewFormulaOpen} onOpenChange={setIsNewFormulaOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Fórmula
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Fórmula</DialogTitle>
              </DialogHeader>
              <FormulaForm onSubmit={handleCreateFormula} onCancel={() => setIsNewFormulaOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center space-x-2 mb-4">
          <div className="relative w-full md:w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="open" className="space-y-4">
          <TabsList>
            <TabsTrigger value="open">Fórmulas (Sistema Aberto)</TabsTrigger>
            <TabsTrigger value="modules">Módulos</TabsTrigger>
            <TabsTrigger value="closed">Fórmulas (Sistema Fechado)</TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            <Card>
              <CardHeader>
                <CardTitle>Fórmulas Enterais (Sistema Aberto)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fórmula enteral</TableHead>
                        <TableHead className="text-center">Dens. Calórica</TableHead>
                        <TableHead className="text-center">Volume</TableHead>
                        <TableHead className="text-center">x/dia</TableHead>
                        <TableHead className="text-center">KCAL</TableHead>
                        <TableHead className="text-center">PTN</TableHead>
                        <TableHead className="text-center">Na</TableHead>
                        <TableHead className="text-center">K</TableHead>
                        <TableHead className="text-center">Fibras</TableHead>
                        <TableHead className="text-center">Água livre</TableHead>
                        <TableHead className="text-center">CHO</TableHead>
                        <TableHead className="text-center">LIP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openFormulas.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.name} <span className="text-xs text-muted-foreground">({f.code})</span></TableCell>
                          <TableCell className="text-center">{f.composition.density?.toFixed(1) || (f.composition.calories / 100).toFixed(1)}</TableCell>
                          <TableCell className="text-center">{f.referenceVolume}</TableCell>
                          <TableCell className="text-center">{f.referenceTimesPerDay}</TableCell>

                          {/* Calculated values based on Reference Volume */}
                          <TableCell className="text-center">{((f.referenceVolume || 100) * (f.composition.density || f.composition.calories / 100)).toFixed(0)}</TableCell>
                          <TableCell className="text-center">{((f.referenceVolume || 100) / 100 * f.composition.protein).toFixed(1)}</TableCell>
                          <TableCell className="text-center">{((f.referenceVolume || 100) / 100 * (f.composition.sodium || 0)).toFixed(0)}</TableCell>
                          <TableCell className="text-center">{((f.referenceVolume || 100) / 100 * (f.composition.potassium || 0)).toFixed(0)}</TableCell>
                          <TableCell className="text-center">{((f.referenceVolume || 100) / 100 * (f.composition.fiber || 0)).toFixed(1)}</TableCell>
                          <TableCell className="text-center">{((f.referenceVolume || 100) / 100 * (f.composition.waterContent || 0)).toFixed(1)}</TableCell>

                          {/* CHO/LIP - User didn't provide absolute values for all, but we can calculate if we had % or g/100ml. 
                              For now, using placeholders or calculated if available in composition. 
                              The user provided specific columns, I will try to calculate from composition if available.
                          */}
                          <TableCell className="text-center">{f.composition.carbohydrates ? ((f.referenceVolume || 100) / 100 * f.composition.carbohydrates).toFixed(1) : '-'}</TableCell>
                          <TableCell className="text-center">{f.composition.fat ? ((f.referenceVolume || 100) / 100 * f.composition.fat).toFixed(1) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <CardTitle>Módulos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Módulos</TableHead>
                        <TableHead className="text-center">DC</TableHead>
                        <TableHead className="text-center">g</TableHead>
                        <TableHead className="text-center">x/dia</TableHead>
                        <TableHead className="text-center">KCAL</TableHead>
                        <TableHead className="text-center">PTN</TableHead>
                        <TableHead className="text-center">Na</TableHead>
                        <TableHead className="text-center">K</TableHead>
                        <TableHead className="text-center">Fibras</TableHead>
                        <TableHead className="text-center">Água Livre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allModules.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell className="text-center">{m.density.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{m.referenceAmount}</TableCell>
                          <TableCell className="text-center">{m.referenceTimesPerDay}</TableCell>
                          <TableCell className="text-center">{m.calories}</TableCell>
                          <TableCell className="text-center">{m.protein}</TableCell>
                          <TableCell className="text-center">{m.sodium}</TableCell>
                          <TableCell className="text-center">{m.potassium}</TableCell>
                          <TableCell className="text-center">{m.fiber}</TableCell>
                          <TableCell className="text-center">{m.freeWater}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="closed">
            <Card>
              <CardHeader>
                <CardTitle>Fórmulas Enterais (Sistema Fechado)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fórmula enteral</TableHead>
                        <TableHead className="text-center">Dens. Calórica</TableHead>
                        <TableHead className="text-center">Volume</TableHead>
                        <TableHead className="text-center">x/dia</TableHead>
                        <TableHead className="text-center">KCAL</TableHead>
                        <TableHead className="text-center">PTN</TableHead>
                        <TableHead className="text-center">Na</TableHead>
                        <TableHead className="text-center">K</TableHead>
                        <TableHead className="text-center">Fibras</TableHead>
                        <TableHead className="text-center">Água livre</TableHead>
                        <TableHead className="text-center">CHO</TableHead>
                        <TableHead className="text-center">LIP</TableHead>
                        <TableHead className="text-center">Pack ml</TableHead>
                        <TableHead className="text-center">Tempo de infusão</TableHead>
                        <TableHead className="text-center">Got</TableHead>
                        <TableHead className="text-center">Nº Packs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closedFormulas.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.name} <span className="text-xs text-muted-foreground">({f.code})</span></TableCell>
                          <TableCell className="text-center">{f.composition.density?.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{f.referenceVolume}</TableCell>
                          <TableCell className="text-center">{f.referenceTimesPerDay}</TableCell>

                          {/* Calculated values based on Reference Volume (which is usually the daily total in this view) */}
                          <TableCell className="text-center">{((f.referenceVolume || 1000) * (f.composition.density || 1)).toFixed(0)}</TableCell>
                          <TableCell className="text-center">{((f.referenceVolume || 1000) / 100 * f.composition.protein).toFixed(0)}</TableCell>
                          <TableCell className="text-center">{((f.referenceVolume || 1000) / 100 * (f.composition.sodium || 0)).toFixed(0)}</TableCell>
                          <TableCell className="text-center">{((f.referenceVolume || 1000) / 100 * (f.composition.potassium || 0)).toFixed(0)}</TableCell>
                          <TableCell className="text-center">{((f.referenceVolume || 1000) / 100 * (f.composition.fiber || 0)).toFixed(1)}</TableCell>
                          <TableCell className="text-center">{((f.referenceVolume || 1000) / 100 * (f.composition.waterContent || 0)).toFixed(1)}</TableCell>
                          <TableCell className="text-center">{f.composition.carbohydrates ? ((f.referenceVolume || 1000) / 100 * f.composition.carbohydrates).toFixed(1) : '-'}</TableCell>
                          <TableCell className="text-center">{f.composition.fat ? ((f.referenceVolume || 1000) / 100 * f.composition.fat).toFixed(1) : '-'}</TableCell>

                          {/* Closed System Specifics */}
                          <TableCell className="text-center">{f.referencePackSize}</TableCell>
                          <TableCell className="text-center">{f.referenceInfusionTime}</TableCell>
                          <TableCell className="text-center">{f.referenceDripRate}</TableCell>
                          <TableCell className="text-center">{f.referenceNumPacks}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Formulas;
