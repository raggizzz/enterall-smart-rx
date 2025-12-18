import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Package, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

interface Supply {
    id: string;
    code: string;
    name: string;
    type: 'bottle' | 'set' | 'other';
    billing_unit?: 'unit' | 'pack' | 'box' | 'other'; // Unidade de faturamento
    capacity_ml?: number;
    unit_price: number;
    plastic_g?: number;
    paper_g?: number;
    metal_g?: number;
    glass_g?: number;
}

const Supplies = () => {
    const [supplies, setSupplies] = useState<Supply[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentSupply, setCurrentSupply] = useState<Partial<Supply>>({});

    useEffect(() => {
        fetchSupplies();
    }, []);

    const fetchSupplies = async () => {
        setIsLoading(true);
        try {
            if (!import.meta.env.VITE_SUPABASE_URL) {
                setSupplies([
                    { id: '1', code: 'FR20', name: 'Frasco Biodose 100', type: 'bottle', capacity_ml: 100, unit_price: 2.50, plastic_g: 5 },
                    { id: '2', code: 'EQ01', name: 'Equipo Gravitacional', type: 'set', unit_price: 1.80, plastic_g: 10 },
                ]);
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('supplies')
                .select('*')
                .order('name');

            if (error) throw error;
            setSupplies(data || []);
        } catch (error) {
            console.error('Error fetching supplies:', error);
            toast.error("Erro ao carregar insumos");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentSupply.name || !currentSupply.code || !currentSupply.type) {
            toast.error("Preencha os campos obrigatórios");
            return;
        }

        try {
            if (!import.meta.env.VITE_SUPABASE_URL) {
                if (currentSupply.id) {
                    setSupplies(supplies.map(s => s.id === currentSupply.id ? { ...s, ...currentSupply } as Supply : s));
                } else {
                    setSupplies([...supplies, { ...currentSupply, id: Date.now().toString() } as Supply]);
                }
                toast.success("Insumo salvo (Mock)");
                setIsDialogOpen(false);
                return;
            }

            if (currentSupply.id) {
                const { error } = await supabase
                    .from('supplies')
                    .update(currentSupply)
                    .eq('id', currentSupply.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('supplies')
                    .insert([currentSupply]);
                if (error) throw error;
            }

            toast.success("Insumo salvo com sucesso!");
            setIsDialogOpen(false);
            fetchSupplies();
        } catch (error) {
            console.error('Error saving supply:', error);
            toast.error("Erro ao salvar insumo");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este insumo?")) return;

        try {
            if (!import.meta.env.VITE_SUPABASE_URL) {
                setSupplies(supplies.filter(s => s.id !== id));
                toast.success("Insumo excluído (Mock)");
                return;
            }

            const { error } = await supabase.from('supplies').delete().eq('id', id);
            if (error) throw error;

            toast.success("Insumo excluído com sucesso!");
            fetchSupplies();
        } catch (error) {
            console.error('Error deleting supply:', error);
            toast.error("Erro ao excluir insumo");
        }
    };

    const filteredSupplies = supplies.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Insumos</h1>
                        <p className="text-muted-foreground">Gerencie frascos, equipos e outros materiais</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setCurrentSupply({})}>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Insumo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{currentSupply.id ? 'Editar' : 'Novo'} Insumo</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
                                {/* Tipo e Código */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Tipo *</Label>
                                        <Select
                                            value={currentSupply.type}
                                            onValueChange={(val: any) => setCurrentSupply({ ...currentSupply, type: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="bottle">Frasco</SelectItem>
                                                <SelectItem value="set">Equipo</SelectItem>
                                                <SelectItem value="other">Outros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Código *</Label>
                                        <Input
                                            placeholder="Ex: FR100"
                                            value={currentSupply.code || ''}
                                            onChange={e => setCurrentSupply({ ...currentSupply, code: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Nome */}
                                <div className="grid gap-2">
                                    <Label>Nome do Produto *</Label>
                                    <Input
                                        placeholder="Ex: Frasco Descartável 100ml"
                                        value={currentSupply.name || ''}
                                        onChange={e => setCurrentSupply({ ...currentSupply, name: e.target.value })}
                                    />
                                </div>

                                {/* Unidade de Faturamento */}
                                <div className="grid gap-2">
                                    <Label>Unidade de Faturamento</Label>
                                    <Select
                                        value={currentSupply.billing_unit || 'unit'}
                                        onValueChange={(val: any) => setCurrentSupply({ ...currentSupply, billing_unit: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unit">Unidade</SelectItem>
                                            <SelectItem value="pack">Pacote</SelectItem>
                                            <SelectItem value="box">Caixa</SelectItem>
                                            <SelectItem value="other">Outros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Campos específicos para Frasco */}
                                {currentSupply.type === 'bottle' && (
                                    <div className="border rounded-lg p-4 bg-blue-50/50 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-5 w-5 text-blue-600" />
                                            <Label className="font-semibold text-blue-800">Dados do Frasco (para cálculo automático)</Label>
                                        </div>
                                        <p className="text-xs text-blue-700">
                                            A capacidade do frasco será usada para calcular automaticamente o número de frascos
                                            necessários com base no volume de dieta e água prescritos.
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Capacidade (mL) *</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Ex: 100, 200, 500"
                                                    value={currentSupply.capacity_ml || ''}
                                                    onChange={e => setCurrentSupply({ ...currentSupply, capacity_ml: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Valor Unitário (R$) *</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={currentSupply.unit_price || ''}
                                                    onChange={e => setCurrentSupply({ ...currentSupply, unit_price: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Campos para Equipo e Outros */}
                                {currentSupply.type && currentSupply.type !== 'bottle' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Capacidade (mL) - Opcional</Label>
                                            <Input
                                                type="number"
                                                value={currentSupply.capacity_ml || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, capacity_ml: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Valor Unitário (R$) *</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={currentSupply.unit_price || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, unit_price: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Seção de Resíduos */}
                                <div className="border-t pt-4 mt-2">
                                    <Label className="mb-3 block font-semibold">Geração de Resíduos por Unidade (g)</Label>
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Plástico</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.plastic_g || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, plastic_g: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Papel/Papelão</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.paper_g || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, paper_g: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Metal</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.metal_g || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, metal_g: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Vidro</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.glass_g || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, glass_g: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleSave} className="w-full mt-4">Salvar Insumo</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou código..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Unid. Faturamento</TableHead>
                                    <TableHead>Capacidade</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell>
                                    </TableRow>
                                ) : filteredSupplies.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Nenhum insumo encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSupplies.map((supply) => (
                                        <TableRow key={supply.id}>
                                            <TableCell className="font-medium">{supply.code}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                    {supply.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${supply.type === 'bottle' ? 'bg-blue-100 text-blue-800' :
                                                    supply.type === 'set' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {supply.type === 'bottle' ? 'Frasco' :
                                                        supply.type === 'set' ? 'Equipo' : 'Outros'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                                                    {supply.billing_unit === 'pack' ? 'Pacote' :
                                                        supply.billing_unit === 'box' ? 'Caixa' :
                                                            supply.billing_unit === 'other' ? 'Outros' : 'Unidade'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {supply.capacity_ml ? `${supply.capacity_ml} mL` : '-'}
                                            </TableCell>
                                            <TableCell>R$ {supply.unit_price?.toFixed(2)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        setCurrentSupply(supply);
                                                        setIsDialogOpen(true);
                                                    }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(supply.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <BottomNav />
        </div>
    );
};

export default Supplies;
