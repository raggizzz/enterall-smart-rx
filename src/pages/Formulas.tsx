import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, DollarSign, Activity, Droplet } from "lucide-react";
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

interface Formula {
  id: string;
  name: string;
  type: "Fechado" | "Aberto";
  calories: number;
  protein: number;
  carbs: number;
  lipids: number;
  fiber: number;
  osmolarity: number;
  cost: number;
  indication: string;
}

const Formulas = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const formulas: Formula[] = [
    {
      id: "1",
      name: "Nutrison Advanced Diason",
      type: "Fechado",
      calories: 1.0,
      protein: 4.0,
      carbs: 10.6,
      lipids: 3.9,
      fiber: 1.5,
      osmolarity: 295,
      cost: 45.0,
      indication: "Diabetes, hiperglicemia",
    },
    {
      id: "2",
      name: "Fresubin Original",
      type: "Fechado",
      calories: 1.0,
      protein: 3.8,
      carbs: 13.8,
      lipids: 3.4,
      fiber: 1.5,
      osmolarity: 285,
      cost: 38.0,
      indication: "Nutrição geral",
    },
    {
      id: "3",
      name: "Peptamen",
      type: "Fechado",
      calories: 1.0,
      protein: 4.0,
      carbs: 12.7,
      lipids: 3.9,
      fiber: 0,
      osmolarity: 270,
      cost: 52.0,
      indication: "Má absorção, pancreatite",
    },
    {
      id: "4",
      name: "Nutridrink",
      type: "Fechado",
      calories: 1.5,
      protein: 6.0,
      carbs: 18.5,
      lipids: 5.8,
      fiber: 0,
      osmolarity: 365,
      cost: 42.0,
      indication: "Hipercatabolismo",
    },
    {
      id: "5",
      name: "Fórmula Artesanal Padrão",
      type: "Aberto",
      calories: 1.0,
      protein: 3.5,
      carbs: 14.0,
      lipids: 3.0,
      fiber: 2.0,
      osmolarity: 300,
      cost: 12.0,
      indication: "Nutrição geral - econômica",
    },
    {
      id: "6",
      name: "Fórmula Artesanal Hipercalórica",
      type: "Aberto",
      calories: 1.5,
      protein: 5.0,
      carbs: 20.0,
      lipids: 5.0,
      fiber: 1.5,
      osmolarity: 380,
      cost: 18.0,
      indication: "Desnutrição, hipercatabolismo",
    },
  ];

  const filteredFormulas = formulas.filter((formula) =>
    formula.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    formula.indication.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    return type === "Fechado" ? (
      <Badge className="bg-success">Sistema Fechado</Badge>
    ) : (
      <Badge className="bg-info">Sistema Aberto</Badge>
    );
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Fórmulas
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formulas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Disponíveis no sistema</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sistemas Fechados
            </CardTitle>
            <Droplet className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formulas.filter((f) => f.type === "Fechado").length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Maior segurança</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Médio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {(formulas.reduce((acc, f) => acc + f.cost, 0) / formulas.length).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Por litro</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Catálogo de Fórmulas</CardTitle>
              <CardDescription>
                {filteredFormulas.length} fórmula(s) encontrada(s)
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
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fórmula</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Cal/ml</TableHead>
                  <TableHead className="text-center">PTN g/L</TableHead>
                  <TableHead className="text-center">CHO g/L</TableHead>
                  <TableHead className="text-center">LIP g/L</TableHead>
                  <TableHead className="text-center">Fibras g/L</TableHead>
                  <TableHead className="text-center">Osmol.</TableHead>
                  <TableHead className="text-right">Custo/L</TableHead>
                  <TableHead>Indicação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFormulas.map((formula) => (
                  <TableRow key={formula.id}>
                    <TableCell className="font-medium">{formula.name}</TableCell>
                    <TableCell>{getTypeBadge(formula.type)}</TableCell>
                    <TableCell className="text-center">{formula.calories}</TableCell>
                    <TableCell className="text-center">{formula.protein}</TableCell>
                    <TableCell className="text-center">{formula.carbs}</TableCell>
                    <TableCell className="text-center">{formula.lipids}</TableCell>
                    <TableCell className="text-center">{formula.fiber}</TableCell>
                    <TableCell className="text-center">{formula.osmolarity}</TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {formula.cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-sm text-muted-foreground">{formula.indication}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Legenda:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="font-medium">Cal/ml:</span> Calorias por mililitro
              </div>
              <div>
                <span className="font-medium">PTN:</span> Proteínas (gramas/litro)
              </div>
              <div>
                <span className="font-medium">CHO:</span> Carboidratos (gramas/litro)
              </div>
              <div>
                <span className="font-medium">LIP:</span> Lipídios (gramas/litro)
              </div>
              <div>
                <span className="font-medium">Osmol.:</span> Osmolaridade (mOsm/L)
              </div>
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
