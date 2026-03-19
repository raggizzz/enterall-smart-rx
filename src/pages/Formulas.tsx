import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useFormulas, useModules } from "@/hooks/useDatabase";
import { Formula, Module } from "@/lib/database";
import { toast } from "sonner";
import { can } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";

const FORMULA_TAG_OPTIONS = [
  { value: "open", label: "Sistema aberto" },
  { value: "closed", label: "Sistema fechado" },
  { value: "supplement", label: "Suplemento alimentar" },
  { value: "module", label: "Modulo para dieta" },
];

const FORMULA_TYPE_OPTIONS: Array<{ value: Formula["type"]; label: string }> = [
  { value: "standard", label: "Padrao" },
  { value: "high-protein", label: "Hiperproteica" },
  { value: "high-calorie", label: "Hipercalorica" },
  { value: "diabetic", label: "Diabetica" },
  { value: "renal", label: "Renal" },
  { value: "peptide", label: "Peptidica" },
  { value: "fiber", label: "Com fibras" },
  { value: "immune", label: "Imunomoduladora" },
  { value: "oral-supplement", label: "Suplemento oral" },
  { value: "infant-formula", label: "Formula infantil" },
];

const FORMULA_COMPLEXITY_OPTIONS = [
  { value: "polymeric", label: "Polimerica" },
  { value: "oligomeric", label: "Oligomerica" },
];

const FORMULA_AGE_GROUP_OPTIONS = [
  { value: "adult", label: "Adulto" },
  { value: "pediatric", label: "Pediatrico" },
  { value: "infant", label: "Infantil" },
];

const FORMULA_ROUTE_OPTIONS = [
  { value: "enteral", label: "Enteral" },
  { value: "oral", label: "Via oral" },
  { value: "translactation", label: "Translactacao" },
];

type FormulaCatalogKind = "formula" | "supplement";

type FormulaFormState = {
  code: string;
  name: string;
  manufacturer: string;
  catalogKind: FormulaCatalogKind;
  type: Formula["type"];
  systemType: Formula["systemType"];
  formulaTypes: string[];
  classification: string;
  macronutrientComplexity: NonNullable<Formula["macronutrientComplexity"]> | "";
  ageGroup: NonNullable<Formula["ageGroup"]> | "";
  administrationRoutes: NonNullable<Formula["administrationRoutes"]>;
  presentationForm: "liquido" | "po";
  presentations: string;
  presentationDescription: string;
  description: string;
  billingUnit: NonNullable<Formula["billingUnit"]>;
  conversionFactor: string;
  billingPrice: string;
  caloriesPerUnit: string;
  density: string;
  proteinPerUnit: string;
  carbPerUnit: string;
  fatPerUnit: string;
  fiberPerUnit: string;
  proteinPct: string;
  carbPct: string;
  fatPct: string;
  sodiumPerUnit: string;
  potassiumPerUnit: string;
  calciumPerUnit: string;
  phosphorusPerUnit: string;
  waterContent: string;
  osmolality: string;
  proteinSources: string;
  carbSources: string;
  fatSources: string;
  fiberSources: string;
  fiberType: string;
  specialCharacteristics: string;
  plasticG: string;
  paperG: string;
  metalG: string;
  glassG: string;
};

type ModuleFormState = {
  name: string;
  description: string;
  density: string;
  referenceAmount: string;
  referenceTimesPerDay: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  sodium: string;
  potassium: string;
  calcium: string;
  phosphorus: string;
  fiber: string;
  freeWater: string;
  billingUnit: NonNullable<Module["billingUnit"]>;
  billingPrice: string;
  proteinSources: string;
  carbSources: string;
  fatSources: string;
  fiberSources: string;
};

const createFormulaForm = (): FormulaFormState => ({
  code: "",
  name: "",
  manufacturer: "",
  catalogKind: "formula",
  type: "standard",
  systemType: "both",
  formulaTypes: [],
  classification: "",
  macronutrientComplexity: "",
  ageGroup: "",
  administrationRoutes: [],
  presentationForm: "liquido",
  presentations: "1000",
  presentationDescription: "",
  description: "",
  billingUnit: "ml",
  conversionFactor: "",
  billingPrice: "",
  caloriesPerUnit: "",
  density: "",
  proteinPerUnit: "",
  carbPerUnit: "",
  fatPerUnit: "",
  fiberPerUnit: "",
  proteinPct: "",
  carbPct: "",
  fatPct: "",
  sodiumPerUnit: "",
  potassiumPerUnit: "",
  calciumPerUnit: "",
  phosphorusPerUnit: "",
  waterContent: "",
  osmolality: "",
  proteinSources: "",
  carbSources: "",
  fatSources: "",
  fiberSources: "",
  fiberType: "",
  specialCharacteristics: "",
  plasticG: "",
  paperG: "",
  metalG: "",
  glassG: "",
});

const createModuleForm = (): ModuleFormState => ({
  name: "",
  description: "",
  density: "",
  referenceAmount: "1",
  referenceTimesPerDay: "1",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  sodium: "",
  potassium: "",
  calcium: "",
  phosphorus: "",
  fiber: "",
  freeWater: "",
  billingUnit: "g",
  billingPrice: "",
  proteinSources: "",
  carbSources: "",
  fatSources: "",
  fiberSources: "",
});

const toOptionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toRequiredNumber = (value: string) => toOptionalNumber(value) || 0;

const toPresentationArray = (value: string) =>
  value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0);

const renderMeta = (parts: Array<string | undefined>) => parts.filter(Boolean).join(" | ");
const toggleFormulaRoute = (
  current: FormulaFormState,
  value: NonNullable<Formula["administrationRoutes"]>[number],
): FormulaFormState => ({
  ...current,
  administrationRoutes: current.administrationRoutes.includes(value)
    ? current.administrationRoutes.filter((item) => item !== value)
    : [...current.administrationRoutes, value],
});
const getFormulaCatalogKind = (formula?: Pick<Formula, "type" | "formulaTypes"> | null): FormulaCatalogKind =>
  formula?.type === "oral-supplement" || formula?.formulaTypes?.includes("supplement") ? "supplement" : "formula";

const roundDerivedValue = (value?: number) => (typeof value === "number" ? Number(value.toFixed(2)) : undefined);

const Formulas = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewFormulaOpen, setIsNewFormulaOpen] = useState(false);
  const [isNewModuleOpen, setIsNewModuleOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<Formula | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [formulaForm, setFormulaForm] = useState<FormulaFormState>(createFormulaForm());
  const [moduleForm, setModuleForm] = useState<ModuleFormState>(createModuleForm());

  const { formulas, isLoading: formulasLoading, createFormula, updateFormula, deleteFormula } = useFormulas();
  const { modules, isLoading: modulesLoading, createModule, updateModule, deleteModule } = useModules();
  const role = useCurrentRole();
  const canManageFormulas = can(role, "manage_formulas");
  const nutrientReferenceLabel = formulaForm.presentationForm === "po" ? "100 g" : "100 mL";
  const densityUnitLabel = formulaForm.presentationForm === "po" ? "kcal/g" : "kcal/mL";

  const filteredFormulas = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return formulas.filter((formula) =>
      [
        formula.name,
        formula.code,
        formula.manufacturer,
        formula.classification,
        formula.ageGroup,
        formula.fiberType,
        formula.specialCharacteristics,
        formula.description,
        formula.type,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [formulas, searchQuery]);

  const filteredModules = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return modules.filter((moduleItem) =>
      [
        moduleItem.name,
        moduleItem.description,
        moduleItem.proteinSources,
        moduleItem.carbSources,
        moduleItem.fatSources,
        moduleItem.fiberSources,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  }, [modules, searchQuery]);

  const resetFormulaForm = () => {
    setFormulaForm(createFormulaForm());
    setEditingFormula(null);
  };

  const resetModuleForm = () => {
    setModuleForm(createModuleForm());
    setEditingModule(null);
  };

  const toggleFormulaTag = (value: string) => {
    setFormulaForm((current) => ({
      ...current,
      formulaTypes: current.formulaTypes.includes(value)
        ? current.formulaTypes.filter((item) => item !== value)
        : [...current.formulaTypes, value],
    }));
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
      catalogKind: getFormulaCatalogKind(formula),
      type: formula.type,
      systemType: formula.systemType,
      formulaTypes: formula.formulaTypes || [],
      classification: formula.classification || "",
      macronutrientComplexity: formula.macronutrientComplexity || "",
      ageGroup: formula.ageGroup || "",
      administrationRoutes: formula.administrationRoutes || [],
      presentationForm: formula.presentationForm || "liquido",
      presentations: (formula.presentations || []).join(", "),
      presentationDescription: formula.presentationDescription || "",
      description: formula.description || "",
      billingUnit: formula.billingUnit || "ml",
      conversionFactor: formula.conversionFactor?.toString() || "",
      billingPrice: formula.billingPrice?.toString() || "",
      caloriesPerUnit: formula.caloriesPerUnit?.toString() || "",
      density: formula.density?.toString() || "",
      proteinPerUnit: formula.proteinPerUnit?.toString() || "",
      carbPerUnit: formula.carbPerUnit?.toString() || "",
      fatPerUnit: formula.fatPerUnit?.toString() || "",
      fiberPerUnit: formula.fiberPerUnit?.toString() || "",
      proteinPct: formula.proteinPct?.toString() || "",
      carbPct: formula.carbPct?.toString() || "",
      fatPct: formula.fatPct?.toString() || "",
      sodiumPerUnit: formula.sodiumPerUnit?.toString() || "",
      potassiumPerUnit: formula.potassiumPerUnit?.toString() || "",
      calciumPerUnit: formula.calciumPerUnit?.toString() || "",
      phosphorusPerUnit: formula.phosphorusPerUnit?.toString() || "",
      waterContent: formula.waterContent?.toString() || "",
      osmolality: formula.osmolality?.toString() || "",
      proteinSources: formula.proteinSources || "",
      carbSources: formula.carbSources || "",
      fatSources: formula.fatSources || "",
      fiberSources: formula.fiberSources || "",
      fiberType: formula.fiberType || "",
      specialCharacteristics: formula.specialCharacteristics || "",
      plasticG: formula.plasticG?.toString() || "",
      paperG: formula.paperG?.toString() || "",
      metalG: formula.metalG?.toString() || "",
      glassG: formula.glassG?.toString() || "",
    });
    setIsNewFormulaOpen(true);
  };

  const handleSaveFormula = async () => {
    if (!canManageFormulas) {
      toast.error("Sem permissao para gerenciar formulas");
      return;
    }

    if (!formulaForm.name.trim() || !formulaForm.code.trim()) {
      toast.error("Preencha nome e codigo da formula");
      return;
    }

    const presentations = toPresentationArray(formulaForm.presentations);
    if (presentations.length === 0) {
      toast.error("Informe pelo menos uma apresentacao valida");
      return;
    }

    const sessionHospitalId =
      typeof window !== "undefined" ? localStorage.getItem("userHospitalId") || undefined : undefined;

    const density = toOptionalNumber(formulaForm.density);
    const caloriesPerUnit = roundDerivedValue(density ? density * 100 : 0) || 0;
    const proteinPct = toOptionalNumber(formulaForm.proteinPct);
    const carbPct = toOptionalNumber(formulaForm.carbPct);
    const fatPct = toOptionalNumber(formulaForm.fatPct);
    const proteinPerUnit = roundDerivedValue(
      typeof proteinPct === "number" ? (caloriesPerUnit * proteinPct) / 400 : undefined,
    ) || 0;
    const carbPerUnit = roundDerivedValue(
      typeof carbPct === "number" ? (caloriesPerUnit * carbPct) / 400 : undefined,
    );
    const fatPerUnit = roundDerivedValue(
      typeof fatPct === "number" ? (caloriesPerUnit * fatPct) / 900 : undefined,
    );
    const formulaTypes = formulaForm.formulaTypes.filter((item) => item !== "supplement" && item !== "module");

    if (formulaForm.catalogKind === "supplement") {
      formulaTypes.push("supplement");
    }

    const formulaType =
      formulaForm.catalogKind === "supplement"
        ? "oral-supplement"
        : formulaForm.type === "oral-supplement"
          ? "standard"
          : formulaForm.type;

    const payload: Omit<Formula, "id" | "createdAt" | "updatedAt"> = {
      hospitalId: editingFormula?.hospitalId || sessionHospitalId,
      code: formulaForm.code.trim(),
      name: formulaForm.name.trim(),
      manufacturer: formulaForm.manufacturer.trim(),
      type: formulaType,
      systemType: formulaForm.systemType,
      formulaTypes,
      classification: formulaForm.classification.trim() || undefined,
      macronutrientComplexity: formulaForm.macronutrientComplexity || undefined,
      presentationForm: formulaForm.presentationForm,
      presentations,
      billingUnit: formulaForm.billingUnit,
      conversionFactor: formulaForm.billingUnit === "unit" ? toOptionalNumber(formulaForm.conversionFactor) : undefined,
      billingPrice: toOptionalNumber(formulaForm.billingPrice),
      caloriesPerUnit,
      density,
      proteinPerUnit,
      carbPerUnit,
      fatPerUnit,
      fiberPerUnit: toOptionalNumber(formulaForm.fiberPerUnit),
      proteinPct,
      carbPct,
      fatPct,
      sodiumPerUnit: toOptionalNumber(formulaForm.sodiumPerUnit),
      potassiumPerUnit: toOptionalNumber(formulaForm.potassiumPerUnit),
      calciumPerUnit: toOptionalNumber(formulaForm.calciumPerUnit),
      phosphorusPerUnit: toOptionalNumber(formulaForm.phosphorusPerUnit),
      waterContent: toOptionalNumber(formulaForm.waterContent),
      osmolality: toOptionalNumber(formulaForm.osmolality),
      proteinSources: formulaForm.proteinSources.trim() || undefined,
      carbSources: formulaForm.carbSources.trim() || undefined,
      fatSources: formulaForm.fatSources.trim() || undefined,
      fiberSources: formulaForm.fiberSources.trim() || undefined,
      fiberType: formulaForm.fiberType.trim() || undefined,
      specialCharacteristics: formulaForm.specialCharacteristics.trim() || undefined,
      plasticG: toOptionalNumber(formulaForm.plasticG),
      paperG: toOptionalNumber(formulaForm.paperG),
      metalG: toOptionalNumber(formulaForm.metalG),
      glassG: toOptionalNumber(formulaForm.glassG),
      isActive: true,
    };

    try {
      if (editingFormula?.id) {
        await updateFormula(editingFormula.id, payload);
        toast.success("Formula atualizada com sucesso");
      } else {
        await createFormula(payload);
        toast.success("Formula criada com sucesso");
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
      toast.success("Formula excluida com sucesso");
    } catch (error) {
      toast.error("Erro ao excluir formula");
    }
  };

  const handleEditModule = (moduleItem: Module) => {
    if (!canManageFormulas) {
      toast.error("Sem permissao para editar modulos");
      return;
    }

    setEditingModule(moduleItem);
    setModuleForm({
      name: moduleItem.name,
      description: moduleItem.description || "",
      density: moduleItem.density?.toString() || "",
      referenceAmount: moduleItem.referenceAmount?.toString() || "1",
      referenceTimesPerDay: moduleItem.referenceTimesPerDay?.toString() || "1",
      calories: moduleItem.calories?.toString() || "",
      protein: moduleItem.protein?.toString() || "",
      carbs: moduleItem.carbs?.toString() || "",
      fat: moduleItem.fat?.toString() || "",
      sodium: moduleItem.sodium?.toString() || "",
      potassium: moduleItem.potassium?.toString() || "",
      calcium: moduleItem.calcium?.toString() || "",
      phosphorus: moduleItem.phosphorus?.toString() || "",
      fiber: moduleItem.fiber?.toString() || "",
      freeWater: moduleItem.freeWater?.toString() || "",
      billingUnit: moduleItem.billingUnit || "g",
      billingPrice: moduleItem.billingPrice?.toString() || "",
      proteinSources: moduleItem.proteinSources || "",
      carbSources: moduleItem.carbSources || "",
      fatSources: moduleItem.fatSources || "",
      fiberSources: moduleItem.fiberSources || "",
    });
    setIsNewModuleOpen(true);
  };

  const handleSaveModule = async () => {
    if (!canManageFormulas) {
      toast.error("Sem permissao para gerenciar modulos");
      return;
    }

    if (!moduleForm.name.trim()) {
      toast.error("Preencha o nome do modulo");
      return;
    }

    const sessionHospitalId =
      typeof window !== "undefined" ? localStorage.getItem("userHospitalId") || undefined : undefined;

    const payload: Omit<Module, "id" | "createdAt" | "updatedAt"> = {
      hospitalId: editingModule?.hospitalId || sessionHospitalId,
      name: moduleForm.name.trim(),
      description: moduleForm.description.trim() || undefined,
      density: toRequiredNumber(moduleForm.density),
      referenceAmount: toRequiredNumber(moduleForm.referenceAmount) || 1,
      referenceTimesPerDay: Math.round(toRequiredNumber(moduleForm.referenceTimesPerDay) || 1),
      calories: toRequiredNumber(moduleForm.calories),
      protein: toRequiredNumber(moduleForm.protein),
      carbs: toOptionalNumber(moduleForm.carbs),
      fat: toOptionalNumber(moduleForm.fat),
      sodium: toRequiredNumber(moduleForm.sodium),
      potassium: toRequiredNumber(moduleForm.potassium),
      calcium: toOptionalNumber(moduleForm.calcium),
      phosphorus: toOptionalNumber(moduleForm.phosphorus),
      fiber: toRequiredNumber(moduleForm.fiber),
      freeWater: toRequiredNumber(moduleForm.freeWater),
      billingUnit: moduleForm.billingUnit,
      billingPrice: toOptionalNumber(moduleForm.billingPrice),
      proteinSources: moduleForm.proteinSources.trim() || undefined,
      carbSources: moduleForm.carbSources.trim() || undefined,
      fatSources: moduleForm.fatSources.trim() || undefined,
      fiberSources: moduleForm.fiberSources.trim() || undefined,
      isActive: true,
    };

    try {
      if (editingModule?.id) {
        await updateModule(editingModule.id, payload);
        toast.success("Modulo atualizado com sucesso");
      } else {
        await createModule(payload);
        toast.success("Modulo criado com sucesso");
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
      toast.success("Modulo excluido com sucesso");
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
            <p className="text-muted-foreground">Cadastro completo de formulas, suplementos e modulos com composicao, residuos e faturamento.</p>
          </div>
          <div className="flex gap-2">
            {canManageFormulas && (
              <Dialog
                open={isNewFormulaOpen}
                onOpenChange={(open) => {
                  setIsNewFormulaOpen(open);
                  if (!open) resetFormulaForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Formula
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingFormula ? "Editar" : "Cadastrar Nova"} Formula</DialogTitle>
                    <DialogDescription>Use os campos abaixo para refletir melhor o cadastro das planilhas e etiquetas.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Codigo *</Label><Input value={formulaForm.code} onChange={(e) => setFormulaForm({ ...formulaForm, code: e.target.value })} placeholder="Ex: FTNEA07" /></div>
                      <div className="space-y-2"><Label>Fabricante</Label><Input value={formulaForm.manufacturer} onChange={(e) => setFormulaForm({ ...formulaForm, manufacturer: e.target.value })} placeholder="Ex: Nestle" /></div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={formulaForm.catalogKind} onValueChange={(value: FormulaCatalogKind) => setFormulaForm({ ...formulaForm, catalogKind: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="formula">Formula</SelectItem>
                            <SelectItem value="supplement">Suplemento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2"><Label>Nome comercial *</Label><Input value={formulaForm.name} onChange={(e) => setFormulaForm({ ...formulaForm, name: e.target.value })} placeholder="Ex: Proline" /></div>
                      <div className="space-y-2">
                        <Label>Apresentacao</Label>
                        <Select value={formulaForm.presentationForm} onValueChange={(value: "liquido" | "po") => setFormulaForm({ ...formulaForm, presentationForm: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="po">Po</SelectItem>
                            <SelectItem value="liquido">Liquido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Densidade calorica ({densityUnitLabel})</Label><Input type="number" step="0.01" value={formulaForm.density} onChange={(e) => setFormulaForm({ ...formulaForm, density: e.target.value })} placeholder="Ex: 1.3" /></div>
                      <div className="space-y-2"><Label>Classificacao</Label><Input value={formulaForm.classification} onChange={(e) => setFormulaForm({ ...formulaForm, classification: e.target.value })} placeholder="Ex: hipercalorica e hiperproteica" /></div>
                      <div className="space-y-2">
                        <Label>Complexidade dos macronutrientes</Label>
                        <Select value={formulaForm.macronutrientComplexity || undefined} onValueChange={(value: NonNullable<Formula["macronutrientComplexity"]>) => setFormulaForm({ ...formulaForm, macronutrientComplexity: value })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{FORMULA_COMPLEXITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2"><Label>Embalagem padrao ({formulaForm.presentationForm === "po" ? "g" : "mL"})</Label><Input value={formulaForm.presentations} onChange={(e) => setFormulaForm({ ...formulaForm, presentations: e.target.value })} placeholder="Ex: 1000" /></div>
                      <div className="space-y-2">
                        <Label>Unidade de faturamento</Label>
                        <Select value={formulaForm.billingUnit} onValueChange={(value: NonNullable<Formula["billingUnit"]>) => setFormulaForm({ ...formulaForm, billingUnit: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ml">mL</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="unit">Unidade</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formulaForm.billingUnit === "unit" && (
                        <div className="space-y-2"><Label>Conversao por unidade ({formulaForm.presentationForm === "po" ? "g" : "mL"})</Label><Input type="number" step="0.01" value={formulaForm.conversionFactor} onChange={(e) => setFormulaForm({ ...formulaForm, conversionFactor: e.target.value })} placeholder="Ex: 200" /></div>
                      )}
                      <div className="space-y-2"><Label>Valor por unidade (R$)</Label><Input type="number" step="0.01" value={formulaForm.billingPrice} onChange={(e) => setFormulaForm({ ...formulaForm, billingPrice: e.target.value })} placeholder="Ex: 0,08" /></div>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                      As gramas de proteina, carboidrato e lipidio por {nutrientReferenceLabel} sao calculadas automaticamente a partir da densidade calorica e do percentual do valor energetico total.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Proteinas (% do VET)</Label><Input type="number" step="0.01" value={formulaForm.proteinPct} onChange={(e) => setFormulaForm({ ...formulaForm, proteinPct: e.target.value })} placeholder="Ex: 23" /></div>
                      <div className="space-y-2"><Label>Fontes de proteina</Label><Textarea value={formulaForm.proteinSources} onChange={(e) => setFormulaForm({ ...formulaForm, proteinSources: e.target.value })} rows={2} /></div>
                      <div className="space-y-2"><Label>Carboidratos (% do VET)</Label><Input type="number" step="0.01" value={formulaForm.carbPct} onChange={(e) => setFormulaForm({ ...formulaForm, carbPct: e.target.value })} placeholder="Ex: 46" /></div>
                      <div className="space-y-2"><Label>Fontes de carboidrato</Label><Textarea value={formulaForm.carbSources} onChange={(e) => setFormulaForm({ ...formulaForm, carbSources: e.target.value })} rows={2} /></div>
                      <div className="space-y-2"><Label>Lipidios (% do VET)</Label><Input type="number" step="0.01" value={formulaForm.fatPct} onChange={(e) => setFormulaForm({ ...formulaForm, fatPct: e.target.value })} placeholder="Ex: 31" /></div>
                      <div className="space-y-2"><Label>Fontes de lipidio</Label><Textarea value={formulaForm.fatSources} onChange={(e) => setFormulaForm({ ...formulaForm, fatSources: e.target.value })} rows={2} /></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Fibras (g/{nutrientReferenceLabel})</Label><Input type="number" step="0.01" value={formulaForm.fiberPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, fiberPerUnit: e.target.value })} placeholder="Ex: 0.8" /></div>
                      <div className="space-y-2"><Label>Fontes de fibra</Label><Textarea value={formulaForm.fiberSources} onChange={(e) => setFormulaForm({ ...formulaForm, fiberSources: e.target.value })} rows={2} /></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="space-y-2"><Label>Potassio (mg/{nutrientReferenceLabel})</Label><Input type="number" step="0.01" value={formulaForm.potassiumPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, potassiumPerUnit: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Fosforo (mg/{nutrientReferenceLabel})</Label><Input type="number" step="0.01" value={formulaForm.phosphorusPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, phosphorusPerUnit: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Sodio (mg/{nutrientReferenceLabel})</Label><Input type="number" step="0.01" value={formulaForm.sodiumPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, sodiumPerUnit: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Calcio (mg/{nutrientReferenceLabel})</Label><Input type="number" step="0.01" value={formulaForm.calciumPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, calciumPerUnit: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Agua livre total (%)</Label><Input type="number" step="0.01" value={formulaForm.waterContent} onChange={(e) => setFormulaForm({ ...formulaForm, waterContent: e.target.value })} placeholder="Ex: 76" /></div>
                    </div>

                    <div className="space-y-2">
                      <Label>Outras caracteristicas</Label>
                      <Textarea value={formulaForm.specialCharacteristics} onChange={(e) => setFormulaForm({ ...formulaForm, specialCharacteristics: e.target.value })} rows={3} placeholder="Ex: adicionada de arginina e prolina, com vitaminas A, E e C, zinco e selenio, sem adicao de sacarose." />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium">Residuo gerado</h3>
                        <p className="text-sm text-muted-foreground">Informar em g por 1000 mL de formula utilizada.</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2"><Label>Plastico</Label><Input type="number" step="0.01" value={formulaForm.plasticG} onChange={(e) => setFormulaForm({ ...formulaForm, plasticG: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Papel</Label><Input type="number" step="0.01" value={formulaForm.paperG} onChange={(e) => setFormulaForm({ ...formulaForm, paperG: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Metal</Label><Input type="number" step="0.01" value={formulaForm.metalG} onChange={(e) => setFormulaForm({ ...formulaForm, metalG: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Vidro</Label><Input type="number" step="0.01" value={formulaForm.glassG} onChange={(e) => setFormulaForm({ ...formulaForm, glassG: e.target.value })} /></div>
                      </div>
                    </div>

                    <Button onClick={handleSaveFormula} className="w-full">{editingFormula ? "Salvar Alteracoes" : "Criar Formula"}</Button>

                    {/* Legacy advanced fields remain mounted, but hidden, until downstream cleanup is complete. */}
                    <div className="hidden">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2"><Label>Embalagem padrao ({formulaForm.presentationForm === "po" ? "g" : "mL"})</Label><Input value={formulaForm.presentations} onChange={(e) => setFormulaForm({ ...formulaForm, presentations: e.target.value })} placeholder="Ex: 1000" /></div>
                        <div className="space-y-2">
                          <Label>Unidade de faturamento</Label>
                          <Select value={formulaForm.billingUnit} onValueChange={(value: NonNullable<Formula["billingUnit"]>) => setFormulaForm({ ...formulaForm, billingUnit: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ml">mL</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="unit">Unidade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Complexidade</Label>
                          <Select value={formulaForm.macronutrientComplexity || undefined} onValueChange={(value: NonNullable<Formula["macronutrientComplexity"]>) => setFormulaForm({ ...formulaForm, macronutrientComplexity: value })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>{FORMULA_COMPLEXITY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Tipo de fibra</Label><Input value={formulaForm.fiberType} onChange={(e) => setFormulaForm({ ...formulaForm, fiberType: e.target.value })} placeholder="Ex: soluvel, insolúvel, mista" /></div>
                      </div>

                      <div className="space-y-2">
                        <Label>Aplicacoes da formula</Label>
                        <div className="flex flex-wrap gap-2">
                          {FORMULA_TAG_OPTIONS.map((tag) => (
                            <Button key={tag.value} type="button" variant={formulaForm.formulaTypes.includes(tag.value) ? "default" : "outline"} size="sm" onClick={() => toggleFormulaTag(tag.value)}>
                              {tag.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Rotas/uso permitidos</Label>
                        <div className="flex flex-wrap gap-2">
                          {FORMULA_ROUTE_OPTIONS.map((route) => (
                            <Button
                              key={route.value}
                              type="button"
                              variant={formulaForm.administrationRoutes.includes(route.value as NonNullable<Formula["administrationRoutes"]>[number]) ? "default" : "outline"}
                              size="sm"
                              onClick={() => setFormulaForm((current) => toggleFormulaRoute(current, route.value as NonNullable<Formula["administrationRoutes"]>[number]))}
                            >
                              {route.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Apresentacoes (ml ou g)</Label><Input value={formulaForm.presentations} onChange={(e) => setFormulaForm({ ...formulaForm, presentations: e.target.value })} placeholder="250, 500, 1000" /></div>
                        <div className="space-y-2 md:col-span-2"><Label>Descricao de apresentacao</Label><Input value={formulaForm.presentationDescription} onChange={(e) => setFormulaForm({ ...formulaForm, presentationDescription: e.target.value })} placeholder="Ex: Tetra Square 1000 ml / lata 400 g" /></div>
                      </div>
                      <div className="space-y-2"><Label>Descricao operacional</Label><Textarea value={formulaForm.description} onChange={(e) => setFormulaForm({ ...formulaForm, description: e.target.value })} rows={3} /></div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Unidade de faturamento</Label>
                          <Select value={formulaForm.billingUnit} onValueChange={(value: NonNullable<Formula["billingUnit"]>) => setFormulaForm({ ...formulaForm, billingUnit: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ml">mL</SelectItem>
                              <SelectItem value="g">g</SelectItem>
                              <SelectItem value="unit">Unidade</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Conversao por unidade</Label><Input type="number" step="0.01" value={formulaForm.conversionFactor} onChange={(e) => setFormulaForm({ ...formulaForm, conversionFactor: e.target.value })} disabled={formulaForm.billingUnit !== "unit"} /></div>
                        <div className="space-y-2"><Label>Valor unitario (R$)</Label><Input type="number" step="0.01" value={formulaForm.billingPrice} onChange={(e) => setFormulaForm({ ...formulaForm, billingPrice: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-2"><Label>Kcal/100 ml</Label><Input type="number" step="0.1" value={formulaForm.caloriesPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, caloriesPerUnit: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Densidade</Label><Input type="number" step="0.01" value={formulaForm.density} onChange={(e) => setFormulaForm({ ...formulaForm, density: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Proteina/100 ml</Label><Input type="number" step="0.1" value={formulaForm.proteinPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, proteinPerUnit: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Carbo/100 ml</Label><Input type="number" step="0.1" value={formulaForm.carbPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, carbPerUnit: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Lipidio/100 ml</Label><Input type="number" step="0.1" value={formulaForm.fatPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, fatPerUnit: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Fibra/100 ml</Label><Input type="number" step="0.1" value={formulaForm.fiberPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, fiberPerUnit: e.target.value })} /></div>
                        <div className="space-y-2"><Label>% proteinas</Label><Input type="number" step="0.1" value={formulaForm.proteinPct} onChange={(e) => setFormulaForm({ ...formulaForm, proteinPct: e.target.value })} /></div>
                        <div className="space-y-2"><Label>% carbo</Label><Input type="number" step="0.1" value={formulaForm.carbPct} onChange={(e) => setFormulaForm({ ...formulaForm, carbPct: e.target.value })} /></div>
                        <div className="space-y-2"><Label>% lipidios</Label><Input type="number" step="0.1" value={formulaForm.fatPct} onChange={(e) => setFormulaForm({ ...formulaForm, fatPct: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Agua livre (%)</Label><Input type="number" step="0.1" value={formulaForm.waterContent} onChange={(e) => setFormulaForm({ ...formulaForm, waterContent: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="space-y-2"><Label>Sodio</Label><Input type="number" step="0.1" value={formulaForm.sodiumPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, sodiumPerUnit: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Potassio</Label><Input type="number" step="0.1" value={formulaForm.potassiumPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, potassiumPerUnit: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Calcio</Label><Input type="number" step="0.1" value={formulaForm.calciumPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, calciumPerUnit: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Fosforo</Label><Input type="number" step="0.1" value={formulaForm.phosphorusPerUnit} onChange={(e) => setFormulaForm({ ...formulaForm, phosphorusPerUnit: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Osmolalidade</Label><Input type="number" step="0.1" value={formulaForm.osmolality} onChange={(e) => setFormulaForm({ ...formulaForm, osmolality: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Fontes proteicas</Label><Textarea value={formulaForm.proteinSources} onChange={(e) => setFormulaForm({ ...formulaForm, proteinSources: e.target.value })} rows={2} /></div>
                        <div className="space-y-2"><Label>Fontes de carboidrato</Label><Textarea value={formulaForm.carbSources} onChange={(e) => setFormulaForm({ ...formulaForm, carbSources: e.target.value })} rows={2} /></div>
                        <div className="space-y-2"><Label>Fontes lipidicas</Label><Textarea value={formulaForm.fatSources} onChange={(e) => setFormulaForm({ ...formulaForm, fatSources: e.target.value })} rows={2} /></div>
                        <div className="space-y-2"><Label>Fontes de fibra</Label><Textarea value={formulaForm.fiberSources} onChange={(e) => setFormulaForm({ ...formulaForm, fiberSources: e.target.value })} rows={2} /></div>
                      </div>
                      <div className="space-y-2"><Label>Outras caracteristicas / observacoes tecnicas</Label><Textarea value={formulaForm.specialCharacteristics} onChange={(e) => setFormulaForm({ ...formulaForm, specialCharacteristics: e.target.value })} rows={3} placeholder="Ex: sem lactose, com TCM, para uso pediatrico, formula infantil para mamadeira/copo..." /></div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2"><Label>Residuo plastico (g)</Label><Input type="number" step="0.1" value={formulaForm.plasticG} onChange={(e) => setFormulaForm({ ...formulaForm, plasticG: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Residuo papel (g)</Label><Input type="number" step="0.1" value={formulaForm.paperG} onChange={(e) => setFormulaForm({ ...formulaForm, paperG: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Residuo metal (g)</Label><Input type="number" step="0.1" value={formulaForm.metalG} onChange={(e) => setFormulaForm({ ...formulaForm, metalG: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Residuo vidro (g)</Label><Input type="number" step="0.1" value={formulaForm.glassG} onChange={(e) => setFormulaForm({ ...formulaForm, glassG: e.target.value })} /></div>
                      </div>
                      <Button onClick={handleSaveFormula} className="w-full">{editingFormula ? "Salvar Alteracoes" : "Criar Formula"}</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {canManageFormulas && (
              <Dialog open={isNewModuleOpen} onOpenChange={(open) => { setIsNewModuleOpen(open); if (!open) resetModuleForm(); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2"><Plus className="h-4 w-4" />Novo Modulo</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingModule ? "Editar" : "Cadastrar Novo"} Modulo</DialogTitle>
                    <DialogDescription>Cadastre quantidade de referencia, composicao e fontes para facilitar prescricao e relatorios.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2"><Label>Nome *</Label><Input value={moduleForm.name} onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })} placeholder="Ex: Modulo proteico" /></div>
                      <div className="space-y-2"><Label>Densidade</Label><Input type="number" step="0.01" value={moduleForm.density} onChange={(e) => setModuleForm({ ...moduleForm, density: e.target.value })} /></div>
                    </div>
                    <div className="space-y-2"><Label>Descricao</Label><Textarea value={moduleForm.description} onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })} rows={2} placeholder="Ex: modulo proteico em po, uso oral/enteral" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2"><Label>Referencia por dose</Label><Input type="number" step="0.1" value={moduleForm.referenceAmount} onChange={(e) => setModuleForm({ ...moduleForm, referenceAmount: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Vezes ao dia</Label><Input type="number" step="1" value={moduleForm.referenceTimesPerDay} onChange={(e) => setModuleForm({ ...moduleForm, referenceTimesPerDay: e.target.value })} /></div>
                      <div className="space-y-2">
                        <Label>Unidade de faturamento</Label>
                        <Select value={moduleForm.billingUnit} onValueChange={(value: NonNullable<Module["billingUnit"]>) => setModuleForm({ ...moduleForm, billingUnit: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="ml">mL</SelectItem>
                            <SelectItem value="unit">Unidade</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Valor unitario (R$)</Label><Input type="number" step="0.01" value={moduleForm.billingPrice} onChange={(e) => setModuleForm({ ...moduleForm, billingPrice: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2"><Label>Kcal/dose</Label><Input type="number" step="0.1" value={moduleForm.calories} onChange={(e) => setModuleForm({ ...moduleForm, calories: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Proteina/dose</Label><Input type="number" step="0.1" value={moduleForm.protein} onChange={(e) => setModuleForm({ ...moduleForm, protein: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Carbo/dose</Label><Input type="number" step="0.1" value={moduleForm.carbs} onChange={(e) => setModuleForm({ ...moduleForm, carbs: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Lipidio/dose</Label><Input type="number" step="0.1" value={moduleForm.fat} onChange={(e) => setModuleForm({ ...moduleForm, fat: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Fibra/dose</Label><Input type="number" step="0.1" value={moduleForm.fiber} onChange={(e) => setModuleForm({ ...moduleForm, fiber: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Agua livre</Label><Input type="number" step="0.1" value={moduleForm.freeWater} onChange={(e) => setModuleForm({ ...moduleForm, freeWater: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Sodio</Label><Input type="number" step="0.1" value={moduleForm.sodium} onChange={(e) => setModuleForm({ ...moduleForm, sodium: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Potassio</Label><Input type="number" step="0.1" value={moduleForm.potassium} onChange={(e) => setModuleForm({ ...moduleForm, potassium: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Calcio</Label><Input type="number" step="0.1" value={moduleForm.calcium} onChange={(e) => setModuleForm({ ...moduleForm, calcium: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Fosforo</Label><Input type="number" step="0.1" value={moduleForm.phosphorus} onChange={(e) => setModuleForm({ ...moduleForm, phosphorus: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Fontes proteicas</Label><Textarea value={moduleForm.proteinSources} onChange={(e) => setModuleForm({ ...moduleForm, proteinSources: e.target.value })} rows={2} /></div>
                      <div className="space-y-2"><Label>Fontes de carboidrato</Label><Textarea value={moduleForm.carbSources} onChange={(e) => setModuleForm({ ...moduleForm, carbSources: e.target.value })} rows={2} /></div>
                      <div className="space-y-2"><Label>Fontes lipidicas</Label><Textarea value={moduleForm.fatSources} onChange={(e) => setModuleForm({ ...moduleForm, fatSources: e.target.value })} rows={2} /></div>
                      <div className="space-y-2"><Label>Fontes de fibra</Label><Textarea value={moduleForm.fiberSources} onChange={(e) => setModuleForm({ ...moduleForm, fiberSources: e.target.value })} rows={2} /></div>
                    </div>
                    <Button onClick={handleSaveModule} className="w-full">{editingModule ? "Salvar Alteracoes" : "Criar Modulo"}</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative w-full md:w-[320px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, codigo, fabricante..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>

        <Tabs defaultValue="formulas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="formulas">Formulas e suplementos ({filteredFormulas.length})</TabsTrigger>
            <TabsTrigger value="modules">Modulos ({filteredModules.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="formulas">
            <Card>
              <CardHeader><CardTitle>Formulas enterais, infantis e suplementos</CardTitle></CardHeader>
              <CardContent>
                {formulasLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando formulas...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Produto</TableHead>
                          <TableHead>Composicao</TableHead>
                          <TableHead>Faturamento</TableHead>
                          <TableHead>Residuos</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFormulas.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma formula encontrada</TableCell></TableRow>
                        ) : (
                          filteredFormulas.map((formula) => (
                            <TableRow key={formula.id} className="align-top">
                              <TableCell className="min-w-[260px]">
                                <div className="font-medium">{formula.name}</div>
                                <div className="text-xs text-muted-foreground">{renderMeta([formula.code, formula.manufacturer, formula.classification])}</div>
                                <div className="text-xs text-muted-foreground">{renderMeta([FORMULA_TYPE_OPTIONS.find((option) => option.value === formula.type)?.label, formula.ageGroup, formula.macronutrientComplexity, formula.systemType, formula.presentationForm, formula.presentations?.length ? `${formula.presentations.join(", ")} ml/g` : undefined])}</div>
                                {formula.formulaTypes?.length ? <div className="text-xs text-muted-foreground mt-1">{formula.formulaTypes.join(", ")}</div> : null}
                                {formula.administrationRoutes?.length ? <div className="text-xs text-muted-foreground mt-1">Uso: {formula.administrationRoutes.join(", ")}</div> : null}
                              </TableCell>
                              <TableCell className="min-w-[260px]">
                                <div className="text-sm">{renderMeta([formula.density ? `${formula.density.toFixed(2)} kcal/ml` : undefined, formula.proteinPerUnit ? `${formula.proteinPerUnit} g PTN/100 ml` : undefined, formula.fiberPerUnit ? `${formula.fiberPerUnit} g fibra/100 ml` : undefined, formula.waterContent ? `${formula.waterContent}% agua livre` : undefined])}</div>
                                <div className="text-xs text-muted-foreground mt-1">{renderMeta([formula.proteinPct ? `${formula.proteinPct}% PTN` : undefined, formula.carbPct ? `${formula.carbPct}% CHO` : undefined, formula.fatPct ? `${formula.fatPct}% LIP` : undefined, formula.fiberType ? `Fibra ${formula.fiberType}` : undefined, formula.osmolality ? `${formula.osmolality} mOsm/L` : undefined])}</div>
                                <div className="text-xs text-muted-foreground mt-1">{renderMeta([formula.proteinSources, formula.carbSources, formula.fatSources, formula.fiberSources])}</div>
                                {formula.specialCharacteristics ? <div className="text-xs text-muted-foreground mt-1">{formula.specialCharacteristics}</div> : null}
                              </TableCell>
                              <TableCell className="min-w-[170px]">
                                <div className="text-sm font-medium">{formula.billingUnit || "-"} {formula.billingPrice ? `| R$ ${formula.billingPrice.toFixed(2)}` : ""}</div>
                                <div className="text-xs text-muted-foreground">{formula.conversionFactor ? `${formula.conversionFactor} por unidade` : "-"}</div>
                              </TableCell>
                              <TableCell className="min-w-[150px]">
                                <div className="text-xs text-muted-foreground">{renderMeta([formula.plasticG ? `Plastico ${formula.plasticG}g` : undefined, formula.paperG ? `Papel ${formula.paperG}g` : undefined, formula.metalG ? `Metal ${formula.metalG}g` : undefined, formula.glassG ? `Vidro ${formula.glassG}g` : undefined]) || "-"}</div>
                              </TableCell>
                              <TableCell className="text-right">
                                {canManageFormulas && (
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditFormula(formula)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => formula.id && handleDeleteFormula(formula.id)}><Trash2 className="h-4 w-4" /></Button>
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
          <TabsContent value="modules">
            <Card>
              <CardHeader><CardTitle>Modulos para nutricao enteral e oral</CardTitle></CardHeader>
              <CardContent>
                {modulesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando modulos...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Modulo</TableHead>
                          <TableHead>Composicao</TableHead>
                          <TableHead>Faturamento</TableHead>
                          <TableHead className="text-right">Acoes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredModules.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum modulo encontrado</TableCell></TableRow>
                        ) : (
                          filteredModules.map((moduleItem) => (
                            <TableRow key={moduleItem.id} className="align-top">
                              <TableCell className="min-w-[240px]">
                                <div className="font-medium">{moduleItem.name}</div>
                                <div className="text-xs text-muted-foreground">{renderMeta([moduleItem.referenceAmount ? `Dose ref. ${moduleItem.referenceAmount}` : undefined, moduleItem.referenceTimesPerDay ? `${moduleItem.referenceTimesPerDay}x/dia` : undefined, moduleItem.density ? `${moduleItem.density.toFixed(2)} kcal/un` : undefined])}</div>
                                {moduleItem.description ? <div className="text-xs text-muted-foreground mt-1">{moduleItem.description}</div> : null}
                              </TableCell>
                              <TableCell className="min-w-[260px]">
                                <div className="text-sm">{renderMeta([moduleItem.calories ? `${moduleItem.calories} kcal` : undefined, moduleItem.protein ? `${moduleItem.protein} g PTN` : undefined, moduleItem.carbs ? `${moduleItem.carbs} g CHO` : undefined, moduleItem.fat ? `${moduleItem.fat} g LIP` : undefined])}</div>
                                <div className="text-xs text-muted-foreground mt-1">{renderMeta([moduleItem.fiber ? `${moduleItem.fiber} g fibra` : undefined, moduleItem.freeWater ? `${moduleItem.freeWater} ml agua` : undefined, moduleItem.sodium ? `${moduleItem.sodium} sodio` : undefined, moduleItem.potassium ? `${moduleItem.potassium} potassio` : undefined, moduleItem.calcium ? `${moduleItem.calcium} calcio` : undefined, moduleItem.phosphorus ? `${moduleItem.phosphorus} fosforo` : undefined])}</div>
                                <div className="text-xs text-muted-foreground mt-1">{renderMeta([moduleItem.proteinSources, moduleItem.carbSources, moduleItem.fatSources, moduleItem.fiberSources])}</div>
                              </TableCell>
                              <TableCell className="min-w-[150px]"><div className="text-sm font-medium">{moduleItem.billingUnit || "-"} {moduleItem.billingPrice ? `| R$ ${moduleItem.billingPrice.toFixed(2)}` : ""}</div></TableCell>
                              <TableCell className="text-right">
                                {canManageFormulas && (
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => handleEditModule(moduleItem)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => moduleItem.id && handleDeleteModule(moduleItem.id)}><Trash2 className="h-4 w-4" /></Button>
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
