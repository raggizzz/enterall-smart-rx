import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, DollarSign, Activity, Droplet, Filter, Building2 } from "lucide-react";
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
import { getAllFormulas, getAllManufacturers, getAllTypes, getFormulasByManufacturer, getFormulasByType, getFormulasBySystem, searchFormulas } from "@/lib/formulasDatabase";

const Formulas = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedSystem, setSelectedSystem] = useState<string>("all");

  const allFormulas = getAllFormulas();
  const manufacturers = getAllManufacturers();
  const types = getAllTypes();

  // Apply filters
  let filteredFormulas = allFormulas;

  if (searchQuery) {
    filteredFormulas = searchFormulas(searchQuery);
  }

  if (selectedManufacturer !== "all") {
    filteredFormulas = filteredFormulas.filter(f => f.manufacturer === selectedManufacturer);
  }

  if (selectedType !== "all") {
    filteredFormulas = filteredFormulas.filter(f => f.type === selectedType);
  }

  if (selectedSystem !== "all") {
    filteredFormulas = filteredFormulas.filter(f => 
      f.systemType === selectedSystem || f.systemType === "both"
    );
  }

  const getSystemBadge = (systemType: string) => {
    if (systemType === "closed") return <Badge className="bg-success">Fechado</Badge>;
    if (systemType === "open") return <Badge className="bg-info">Aberto</Badge>;
    return <Badge variant="outline">Ambos</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'standard': 'bg-gray-500',
      'high-protein': 'bg-red-500',
      'high-calorie': 'bg-orange-500',
      'diabetic': 'bg-blue-500',
      'renal': 'bg-purple-500',
      'peptide': 'bg-green-500',
      'fiber': 'bg-yellow-600',
      'immune': 'bg-pink-500',
    };
    return <Badge className={colors[type] || 'bg-gray-500'}>{type}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Fórmulas Enterais</h1>
          <p className="text-muted-foreground">Catálogo de fórmulas disponíveis no hospital</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Fórmulas
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{allFormulas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Cadastradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fabricantes
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{manufacturers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Diferentes marcas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sistema Fechado
            </CardTitle>
            <Droplet className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {allFormulas.filter((f) => f.systemType === "closed").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Maior segurança</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tipos
            </CardTitle>
            <Filter className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{types.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Categorias</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Catálogo de Fórmulas</CardTitle>
                <CardDescription>
                  {filteredFormulas.length} de {allFormulas.length} fórmula(s)
                </CardDescription>
              </div>
              <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar fórmulas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fabricante</Label>
                <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {manufacturers.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {types.map(t => (
                      <SelectItem key={t.type} value={t.type}>{t.label} ({t.count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sistema</Label>
                <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                    <SelectItem value="open">Aberto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fórmula</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Cal/100ml</TableHead>
                  <TableHead className="text-center">PTN g/100ml</TableHead>
                  <TableHead className="text-center">CHO g/100ml</TableHead>
                  <TableHead className="text-center">LIP g/100ml</TableHead>
                  <TableHead className="text-center">Fibras</TableHead>
                  <TableHead className="text-center">Osmol.</TableHead>
                  <TableHead>Indicações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFormulas.map((formula) => (
                  <TableRow key={formula.id}>
                    <TableCell className="font-medium">{formula.name}</TableCell>
                    <TableCell className="text-sm">{formula.manufacturer}</TableCell>
                    <TableCell>{getSystemBadge(formula.systemType)}</TableCell>
                    <TableCell>{getTypeBadge(formula.type)}</TableCell>
                    <TableCell className="text-center font-medium">{formula.composition.calories}</TableCell>
                    <TableCell className="text-center">{formula.composition.protein}</TableCell>
                    <TableCell className="text-center">{formula.composition.carbohydrates}</TableCell>
                    <TableCell className="text-center">{formula.composition.fat}</TableCell>
                    <TableCell className="text-center">{formula.composition.fiber || '-'}</TableCell>
                    <TableCell className="text-center text-xs">{formula.composition.osmolality || '-'}</TableCell>
                    <TableCell className="max-w-[250px]">
                      <div className="text-xs text-muted-foreground space-y-1">
                        {formula.indications.slice(0, 2).map((ind, i) => (
                          <div key={i}>• {ind}</div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-3">Legenda e Informações:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div><span className="font-medium">Cal/100ml:</span> Calorias por 100 mililitros</div>
                <div><span className="font-medium">PTN:</span> Proteínas em gramas por 100ml</div>
                <div><span className="font-medium">CHO:</span> Carboidratos em gramas por 100ml</div>
                <div><span className="font-medium">LIP:</span> Lipídios em gramas por 100ml</div>
              </div>
              <div className="space-y-2">
                <div><span className="font-medium">Fibras:</span> Fibras em gramas por 100ml</div>
                <div><span className="font-medium">Osmol.:</span> Osmolalidade em mOsm/kg</div>
                <div><span className="font-medium">Sistema Fechado:</span> Pronto para uso, menor risco de contaminação</div>
                <div><span className="font-medium">Sistema Aberto:</span> Requer preparo, mais econômico</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                💡 <strong>Dica:</strong> Use os filtros acima para encontrar fórmulas específicas por fabricante, tipo ou sistema.
                Todas as informações nutricionais são por 100ml de produto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
      <BottomNav />
    </div>
  );
};

export default Formulas;
