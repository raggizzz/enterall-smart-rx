import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useFormulas, useModules } from "@/hooks/useDatabase";
import { Formula, Module } from "@/lib/database";
import { toast } from "sonner";
import { can } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";

const Formulas = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewFormulaOpen, setIsNewFormulaOpen] = useState(false);
  const [isNewModuleOpen, setIsNewModuleOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  const { formulas, isLoading: formulasLoading, createFormula, updateFormula, deleteFormula } = useFormulas();
  const { modules, isLoading: modulesLoading, createModule, updateModule, deleteModule } = useModules();
  const role = useCurrentRole();
  const canManageFormulas = can(role, "manage_formulas");

  // Formula form state
  const [formulaForm, setFormulaForm] = useState({
    code: "",
    name: "",
    manufacturer: "",
    type: "standard" as Formula['type'],
    systemType: "open" as Formula['systemType'],
    presentations: "100",
    caloriesPerUnit: "",
    density: "",
    proteinPerUnit: "",
    proteinPct: "",
    carbPct: "",
    fatPct: "",
    fiberPerUnit: "",
    billingUnit: "ml" as Formula['billingUnit'],
    billingPrice: "",
  });

  // Module form state
  const [moduleForm, setModuleForm] = useState({
    name: "",
    density: "",
    referenceAmount: "",
    referenceTimesPerDay: "",
    calories: "",
    protein: "",
    sodium: "",
    potassium: "",
    fiber: "",
    freeWater: "",
    billingUnit: "g" as Module['billingUnit'],
    billingPrice: "",
  });

  // Filter formulas
  const filteredFormulas = formulas.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter modules
  const filteredModules = modules.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetFormulaForm = () => {
    setFormulaForm({
      code: "",
      name: "",
      manufacturer: "",
      type: "standard",
      systemType: "open",
      presentations: "100",
      caloriesPerUnit: "",
      density: "",
      proteinPerUnit: "",
      proteinPct: "",
      carbPct: "",
      fatPct: "",
      fiberPerUnit: "",
      billingUnit: "ml",
      billingPrice: "",
    });
    setEditingFormula(null);
  };

  const resetModuleForm = () => {
    setModuleForm({
      name: "",
      density: "",
      referenceAmount: "",
      referenceTimesPerDay: "",
      calories: "",
      protein: "",
      sodium: "",
      potassium: "",
      fiber: "",
      freeWater: "",
      billingUnit: "g",
      billingPrice: "",
    });
    setEditingModule(null);
  };

  const handleEditFormula = (formula: Formula) => {
    if (!canManageFormulas) {
      toast.error("Sem permissao para editar formulas");
      return;
    }

    setEditingFormula(formula);
    setFormulaForm({
      code: formula.code || "",
      name: formula.name,
      manufacturer: formula.manufacturer || "",
      type: formula.type,
      systemType: formula.systemType,
      presentations: formula.presentations.join(", "),
      caloriesPerUnit: formula.caloriesPerUnit?.toString() || "",
      density: formula.density?.toString() || "",
      proteinPerUnit: formula.proteinPerUnit?.toString() || "",
      proteinPct: formula.proteinPct?.toString() || "",
      carbPct: formula.carbPct?.toString() || "",
      fatPct: formula.fatPct?.toString() || "",
      fiberPerUnit: formula.fiberPerUnit?.toString() || "",
      billingUnit: formula.billingUnit || "ml",
      billingPrice: formula.billingPrice?.toString() || "",
    });
    setIsNewFormulaOpen(true);
  };

  const handleSaveFormula = async () => {
    if (!canManageFormulas) {
      toast.error("Sem permissao para gerenciar formulas");
      return;
    }

    if (!formulaForm.name || !formulaForm.code) {
      toast.error("Preencha nome e codigo da formula");
      return;
    }

    const formulaData = {
      code: formulaForm.code,
      name: formulaForm.name,
      manufacturer: formulaForm.manufacturer,
      type: formulaForm.type,
      systemType: formulaForm.systemType,
      presentations: formulaForm.presentations.split(",").map(p => parseInt(p.trim())).filter(p => !isNaN(p)),
      caloriesPerUnit: parseFloat(formulaForm.caloriesPerUnit) || 0,
      density: parseFloat(formulaForm.density) || 0,
      proteinPerUnit: parseFloat(formulaForm.proteinPerUnit) || 0,
      proteinPct: parseFloat(formulaForm.proteinPct) || undefined,
      carbPct: parseFloat(formulaForm.carbPct) || undefined,
      fatPct: parseFloat(formulaForm.fatPct) || undefined,
      fiberPerUnit: parseFloat(formulaForm.fiberPerUnit) || undefined,
      billingUnit: formulaForm.billingUnit,
      billingPrice: parseFloat(formulaForm.billingPrice) || undefined,
      isActive: true,
    };

    try {
      if (editingFormula?.id) {
        await updateFormula(editingFormula.id, formulaData);
        toast.success("Formula atualizada com sucesso!");
      } else {
        await createFormula(formulaData);
        toast.success("Formula criada com sucesso!");
      }
      setIsNewFormulaOpen(false);
      resetFormulaForm();
    } catch (error) {
      console.error("Error saving formula:", error);
      toast.error("Erro ao salvar formula");
    }
  };

  const handleDeleteFormula = async (id: string) => {
    if (!canManageFormulas) {
      toast.error("Sem permissao para excluir formulas");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir esta formula?")) return;
    try {
      await deleteFormula(id);
      toast.success("Formula excluida com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir formula");
    }
  };

  const handleEditModule = (module: Module) => {
    if (!canManageFormulas) {
      toast.error("Sem permissao para editar modulos");
      return;
    }

    setEditingModule(module);
    setModuleForm({
      name: module.name,
      density: module.density?.toString() || "",
      referenceAmount: module.referenceAmount?.toString() || "",
      referenceTimesPerDay: module.referenceTimesPerDay?.toString() || "",
      calories: module.calories?.toString() || "",
      protein: module.protein?.toString() || "",
      sodium: module.sodium?.toString() || "",
      potassium: module.potassium?.toString() || "",
      fiber: module.fiber?.toString() || "",
      freeWater: module.freeWater?.toString() || "",
      billingUnit: module.billingUnit || "g",
      billingPrice: module.billingPrice?.toString() || "",
    });
    setIsNewModuleOpen(true);
  };

  const handleSaveModule = async () => {
    if (!canManageFormulas) {
      toast.error("Sem permissao para gerenciar modulos");
      return;
    }

    if (!moduleForm.name) {
      toast.error("Preencha o nome do modulo");
      return;
    }

    const moduleData = {
      name: moduleForm.name,
      density: parseFloat(moduleForm.density) || 0,
      referenceAmount: parseFloat(moduleForm.referenceAmount) || 0,
      referenceTimesPerDay: parseFloat(moduleForm.referenceTimesPerDay) || 0,
      calories: parseFloat(moduleForm.calories) || 0,
      protein: parseFloat(moduleForm.protein) || 0,
      sodium: parseFloat(moduleForm.sodium) || 0,
      potassium: parseFloat(moduleForm.potassium) || 0,
      fiber: parseFloat(moduleForm.fiber) || 0,
      freeWater: parseFloat(moduleForm.freeWater) || 0,
      billingUnit: moduleForm.billingUnit,
      billingPrice: parseFloat(moduleForm.billingPrice) || undefined,
      isActive: true,
    };

    try {
      if (editingModule?.id) {
        await updateModule(editingModule.id, moduleData);
        toast.success("Modulo atualizado com sucesso!");
      } else {
        await createModule(moduleData);
        toast.success("Modulo criado com sucesso!");
      }
      setIsNewModuleOpen(false);
      resetModuleForm();
    } catch (error) {
      console.error("Error saving module:", error);
      toast.error("Erro ao salvar modulo");
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!canManageFormulas) {
      toast.error("Sem permissao para excluir modulos");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este modulo?")) return;
    try {
      await deleteModule(id);
      toast.success("Modulo excluido com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir modulo");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Catalogo de Nutricao</h1>
            <p className="text-muted-foreground">Formulas Enterais e Modulos - Banco de Dados Local</p>
          </div>
          <div className="flex gap-2">
            {/* New Formula Dialog */}
            {canManageFormulas && (
            <Dialog open={isNewFormulaOpen} onOpenChange={(open) => {
              setIsNewFormulaOpen(open);
              if (!open) resetFormulaForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Formula
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingFormula ? 'Editar' : 'Cadastrar Nova'} Formula</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Codigo *</Label>
                      <Input
                        value={formulaForm.code}
                        onChange={(e) => setFormulaForm({ ...formulaForm, code: e.target.value })}
                        placeholder="Ex: FTNEA06"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome Comercial *</Label>
                      <Input
                        value={formulaForm.name}
                        onChange={(e) => setFormulaForm({ ...formulaForm, name: e.target.value })}
                        placeholder="Ex: Novasource Senior"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Fabricante</Label>
                      <Input
                        value={formulaForm.manufacturer}
                        onChange={(e) => setFormulaForm({ ...formulaForm, manufacturer: e.target.value })}
                        placeholder="Ex: Nestle"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={formulaForm.type}
                        onValueChange={(val: Formula['type']) => setFormulaForm({ ...formulaForm, type: val })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Padrao</SelectItem>
                          <SelectItem value="high-protein">Hiperproteica</SelectItem>
                          <SelectItem value="high-calorie">Hipercalorica</SelectItem>
                          <SelectItem value="diabetic">Diabetica</SelectItem>
                          <SelectItem value="renal">Renal</SelectItem>
                          <SelectItem value="peptide">Peptidica</SelectItem>
                          <SelectItem value="fiber">Com Fibras</SelectItem>
                          <SelectItem value="immune">Imunomoduladora</SelectItem>
                          <SelectItem value="oral-supplement">Suplementos Via Oral</SelectItem>
                          <SelectItem value="infant-formula">Formulas Infantis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sistema</Label>
                      <Select
                        value={formulaForm.systemType}
                        onValueChange={(val: Formula['systemType']) => setFormulaForm({ ...formulaForm, systemType: val })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Aberto</SelectItem>
                          <SelectItem value="closed">Fechado</SelectItem>
                          <SelectItem value="both">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Kcal/100ml</Label>
                      <Input
                        type="number"
                        value={formulaForm.caloriesPerUnit}
                        onChange={(e) => setFormulaForm({ ...formulaForm, caloriesPerUnit: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Densidade (kcal/ml)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formulaForm.density}
                        onChange={(e) => setFormulaForm({ ...formulaForm, density: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Proteina/100ml (g)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formulaForm.proteinPerUnit}
                        onChange={(e) => setFormulaForm({ ...formulaForm, proteinPerUnit: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fibras/100ml (g)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formulaForm.fiberPerUnit}
                        onChange={(e) => setFormulaForm({ ...formulaForm, fiberPerUnit: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>% Proteinas (VET)</Label>
                      <Input
                        type="number"
                        value={formulaForm.proteinPct}
                        onChange={(e) => setFormulaForm({ ...formulaForm, proteinPct: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>% Carboidratos (VET)</Label>
                      <Input
                        type="number"
                        value={formulaForm.carbPct}
                        onChange={(e) => setFormulaForm({ ...formulaForm, carbPct: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>% Lipideos (VET)</Label>
                      <Input
                        type="number"
                        value={formulaForm.fatPct}
                        onChange={(e) => setFormulaForm({ ...formulaForm, fatPct: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Apresentacoes (mL)</Label>
                      <Input
                        value={formulaForm.presentations}
                        onChange={(e) => setFormulaForm({ ...formulaForm, presentations: e.target.value })}
                        placeholder="100, 200, 500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unid. Faturamento</Label>
                      <Select
                        value={formulaForm.billingUnit}
                        onValueChange={(val: Formula['billingUnit']) => setFormulaForm({ ...formulaForm, billingUnit: val })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ml">mL</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="unit">Unidade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formulaForm.billingPrice}
                        onChange={(e) => setFormulaForm({ ...formulaForm, billingPrice: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveFormula} className="w-full mt-4">
                    {editingFormula ? 'Salvar Alteracoes' : 'Criar Formula'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}

            {/* New Module Dialog */}
            {canManageFormulas && (
            <Dialog open={isNewModuleOpen} onOpenChange={(open) => {
              setIsNewModuleOpen(open);
              if (!open) resetModuleForm();
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Modulo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingModule ? 'Editar' : 'Cadastrar Novo'} Modulo</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={moduleForm.name}
                      onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                      placeholder="Ex: Fresubin Protein"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Densidade (kcal/g)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={moduleForm.density}
                        onChange={(e) => setModuleForm({ ...moduleForm, density: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantidade de referencia</Label>
                      <Input
                        type="number"
                        value={moduleForm.referenceAmount}
                        onChange={(e) => setModuleForm({ ...moduleForm, referenceAmount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Vezes ao dia (referencia)</Label>
                      <Input
                        type="number"
                        value={moduleForm.referenceTimesPerDay}
                        onChange={(e) => setModuleForm({ ...moduleForm, referenceTimesPerDay: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Kcal/dose</Label>
                      <Input
                        type="number"
                        value={moduleForm.calories}
                        onChange={(e) => setModuleForm({ ...moduleForm, calories: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Proteina/dose (g)</Label>
                      <Input
                        type="number"
                        value={moduleForm.protein}
                        onChange={(e) => setModuleForm({ ...moduleForm, protein: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fibra/dose (g)</Label>
                      <Input
                        type="number"
                        value={moduleForm.fiber}
                        onChange={(e) => setModuleForm({ ...moduleForm, fiber: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Agua Livre (mL)</Label>
                      <Input
                        type="number"
                        value={moduleForm.freeWater}
                        onChange={(e) => setModuleForm({ ...moduleForm, freeWater: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveModule} className="w-full mt-4">
                    {editingModule ? 'Salvar Alteracoes' : 'Criar Modulo'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
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
            <TabsTrigger value="formulas">Formulas e Suplementos ({filteredFormulas.length})</TabsTrigger>
            <TabsTrigger value="modules">Modulos ({filteredModules.length})</TabsTrigger>
          </TabsList>

          {/* Tab Formulas */}
          <TabsContent value="formulas">
            <Card>
              <CardHeader>
                <CardTitle>Formulas Enterais</CardTitle>
              </CardHeader>
              <CardContent>
                {formulasLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando formulas...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Formula (Nome + Codigo)</TableHead>
                          <TableHead className="text-center font-semibold">Unid.</TableHead>
                          <TableHead className="text-center font-semibold">Valor (R$)</TableHead>
                          <TableHead className="text-center font-semibold">Dens. Calorica</TableHead>
                          <TableHead className="text-center font-semibold">% Proteinas</TableHead>
                          <TableHead className="text-center font-semibold">% Carbs</TableHead>
                          <TableHead className="text-center font-semibold">% Lipideos</TableHead>
                          <TableHead className="text-center font-semibold">Fibras/100ml</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFormulas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                              Nenhuma formula encontrada
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
                                  {f.billingUnit === 'ml' ? 'mL' : f.billingUnit === 'g' ? 'g' : 'Unid'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {f.billingPrice ? f.billingPrice.toFixed(2) : '-'}
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {f.density?.toFixed(2) || (f.caloriesPerUnit / 100).toFixed(2)} kcal/ml
                              </TableCell>
                              <TableCell className="text-center">
                                {f.proteinPct ? `${f.proteinPct}%` : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {f.carbPct ? `${f.carbPct}%` : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {f.fatPct ? `${f.fatPct}%` : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {f.fiberPerUnit ? `${f.fiberPerUnit}g` : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                {canManageFormulas && (
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditFormula(f)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => f.id && handleDeleteFormula(f.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Modulos */}
          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <CardTitle>Modulos para Nutricao Enteral</CardTitle>
              </CardHeader>
              <CardContent>
                {modulesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando modulos...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Modulo (Nome)</TableHead>
                          <TableHead className="text-center font-semibold">Unid.</TableHead>
                          <TableHead className="text-center font-semibold">Valor (R$)</TableHead>
                          <TableHead className="text-center font-semibold">Dens. Calorica</TableHead>
                          <TableHead className="text-center font-semibold">Proteina/dose</TableHead>
                          <TableHead className="text-center font-semibold">Kcal/dose</TableHead>
                          <TableHead className="text-center font-semibold">Fibras/dose</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredModules.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              Nenhum modulo encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredModules.map((m) => (
                            <TableRow key={m.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium">{m.name}</TableCell>
                              <TableCell className="text-center">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                  {m.billingUnit || 'g'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {m.billingPrice ? m.billingPrice.toFixed(2) : '-'}
                              </TableCell>
                              <TableCell className="text-center font-medium">{m.density?.toFixed(2) || '-'} kcal/g</TableCell>
                              <TableCell className="text-center">{m.protein || '-'}g</TableCell>
                              <TableCell className="text-center">{m.calories || '-'} kcal</TableCell>
                              <TableCell className="text-center">{m.fiber || '-'}g</TableCell>
                              <TableCell className="text-right">
                                {canManageFormulas && (
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditModule(m)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => m.id && handleDeleteModule(m.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
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



