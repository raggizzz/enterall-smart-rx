import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Filtrar módulos também
  const filteredModules = allModules.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        <Tabs defaultValue="formulas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="formulas">Fórmulas Enterais</TabsTrigger>
            <TabsTrigger value="modules">Módulos</TabsTrigger>
          </TabsList>

          {/* Tab Fórmulas - Visão Geral Simplificada */}
          <TabsContent value="formulas">
            <Card>
              <CardHeader>
                <CardTitle>Fórmulas Enterais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Fórmula Enteral (Nome + Código)</TableHead>
                        <TableHead className="text-center font-semibold">Unid. Faturamento</TableHead>
                        <TableHead className="text-center font-semibold">Valor (R$)</TableHead>
                        <TableHead className="text-center font-semibold">Dens. Calórica</TableHead>
                        <TableHead className="text-center font-semibold">% Proteínas</TableHead>
                        <TableHead className="text-center font-semibold">% Carboidratos</TableHead>
                        <TableHead className="text-center font-semibold">% Lipídeos</TableHead>
                        <TableHead className="text-center font-semibold">Fibras/100ml</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFormulas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhuma fórmula encontrada
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFormulas.map((f) => (
                          <TableRow key={f.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              {f.name} <span className="text-xs text-muted-foreground">({f.code || '-'})</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {f.billingUnit === 'ml' ? 'mL' : f.billingUnit === 'g' ? 'g' : f.billingUnit === 'unit' ? 'Unid' : 'mL'}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {f.billingPrice ? f.billingPrice.toFixed(2) : '-'}
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {f.composition.density?.toFixed(2) || (f.composition.calories / 100).toFixed(2)} kcal/ml
                            </TableCell>
                            <TableCell className="text-center">
                              {f.composition.proteinPct ? `${f.composition.proteinPct}%` : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {f.composition.carbohydratesPct ? `${f.composition.carbohydratesPct}%` : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {f.composition.fatPct ? `${f.composition.fatPct}%` : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {f.composition.fiber ? `${f.composition.fiber}g` : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Módulos - Visão Geral Simplificada */}
          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <CardTitle>Módulos para Nutrição Enteral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Módulo (Nome)</TableHead>
                        <TableHead className="text-center font-semibold">Unid. Faturamento</TableHead>
                        <TableHead className="text-center font-semibold">Valor (R$)</TableHead>
                        <TableHead className="text-center font-semibold">Dens. Calórica</TableHead>
                        <TableHead className="text-center font-semibold">Proteína/dose</TableHead>
                        <TableHead className="text-center font-semibold">Kcal/dose</TableHead>
                        <TableHead className="text-center font-semibold">Fibras/dose</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredModules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhum módulo encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredModules.map((m) => (
                          <TableRow key={m.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">{m.name}</TableCell>
                            <TableCell className="text-center">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                g
                              </span>
                            </TableCell>
                            <TableCell className="text-center">-</TableCell>
                            <TableCell className="text-center font-medium">{m.density.toFixed(2)} kcal/g</TableCell>
                            <TableCell className="text-center">{m.protein}g</TableCell>
                            <TableCell className="text-center">{m.calories} kcal</TableCell>
                            <TableCell className="text-center">{m.fiber}g</TableCell>
                          </TableRow>
                        ))
                      )}
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
