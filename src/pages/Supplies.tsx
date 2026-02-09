import { useState } from "react";
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
import Header from "@/components/Header";
import { useSupplies } from "@/hooks/useDatabase";
import { Supply } from "@/lib/database";
import { can } from "@/lib/permissions";
import { useCurrentRole } from "@/hooks/useCurrentRole";

const Supplies = () => {
    const { supplies, isLoading, createSupply, updateSupply, deleteSupply } = useSupplies();
    const role = useCurrentRole();
    const canManageSupplies = can(role, "manage_supplies");
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
    const [currentSupply, setCurrentSupply] = useState<Partial<Supply>>({});

    const resetForm = () => {
        setCurrentSupply({});
        setEditingSupply(null);
    };

    const handleSave = async () => {
        if (!canManageSupplies) {
            toast.error("Sem permissao para gerenciar insumos");
            return;
        }

        if (!currentSupply.name || !currentSupply.code || !currentSupply.type) {
            toast.error("Preencha os campos obrigatÃ³rios");
            return;
        }

        try {
            const supplyData = {
                code: currentSupply.code!,
                name: currentSupply.name!,
                type: currentSupply.type!,
                billingUnit: currentSupply.billingUnit || 'unit',
                capacityMl: currentSupply.capacityMl,
                unitPrice: currentSupply.unitPrice || 0,
                plasticG: currentSupply.plasticG,
                paperG: currentSupply.paperG,
                metalG: currentSupply.metalG,
                glassG: currentSupply.glassG,
                isActive: true,
            };

            if (editingSupply?.id) {
                await updateSupply(editingSupply.id, supplyData);
                toast.success("Insumo atualizado com sucesso!");
            } else {
                await createSupply(supplyData);
                toast.success("Insumo criado com sucesso!");
            }

            setIsDialogOpen(false);
            resetForm();
        } catch (error) {
            console.error('Error saving supply:', error);
            toast.error("Erro ao salvar insumo");
        }
    };

    const handleEdit = (supply: Supply) => {
        if (!canManageSupplies) {
            toast.error("Sem permissao para editar insumos");
            return;
        }

        setEditingSupply(supply);
        setCurrentSupply({
            ...supply,
            // Map from database naming to form
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!canManageSupplies) {
            toast.error("Sem permissao para excluir insumos");
            return;
        }

        if (!confirm("Tem certeza que deseja excluir este insumo?")) return;

        try {
            await deleteSupply(id);
            toast.success("Insumo excluÃ­do com sucesso!");
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
            <Header />
            <div className="container py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Insumos</h1>
                        <p className="text-muted-foreground">Gerencie frascos, equipos e outros materiais da unidade selecionada</p>
                    </div>
                    {canManageSupplies && (
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button onClick={() => resetForm()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Insumo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>{editingSupply ? 'Editar' : 'Novo'} Insumo</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
                                {/* Tipo e CÃ³digo */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Tipo *</Label>
                                        <Select
                                            value={currentSupply.type}
                                            onValueChange={(val: 'bottle' | 'set' | 'other') => setCurrentSupply({ ...currentSupply, type: val })}
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
                                        <Label>CÃ³digo *</Label>
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
                                        placeholder="Ex: Frasco DescartÃ¡vel 100ml"
                                        value={currentSupply.name || ''}
                                        onChange={e => setCurrentSupply({ ...currentSupply, name: e.target.value })}
                                    />
                                </div>

                                {/* Unidade de Faturamento */}
                                <div className="grid gap-2">
                                    <Label>Unidade de Faturamento</Label>
                                    <Select
                                        value={currentSupply.billingUnit || 'unit'}
                                        onValueChange={(val: 'unit' | 'pack' | 'box' | 'other') => setCurrentSupply({ ...currentSupply, billingUnit: val })}
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

                                {/* Campos especÃ­ficos para Frasco */}
                                {currentSupply.type === 'bottle' && (
                                    <div className="border rounded-lg p-4 bg-blue-50/50 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-5 w-5 text-blue-600" />
                                            <Label className="font-semibold text-blue-800">Dados do Frasco (para cÃ¡lculo automÃ¡tico)</Label>
                                        </div>
                                        <p className="text-xs text-blue-700">
                                            A capacidade do frasco serÃ¡ usada para calcular automaticamente o nÃºmero de frascos
                                            necessÃ¡rios com base no volume de dieta e Ã¡gua prescritos.
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label>Capacidade (mL) *</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Ex: 100, 200, 500"
                                                    value={currentSupply.capacityMl || ''}
                                                    onChange={e => setCurrentSupply({ ...currentSupply, capacityMl: parseFloat(e.target.value) })}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label>Valor UnitÃ¡rio (R$) *</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={currentSupply.unitPrice || ''}
                                                    onChange={e => setCurrentSupply({ ...currentSupply, unitPrice: parseFloat(e.target.value) })}
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
                                                value={currentSupply.capacityMl || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, capacityMl: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Valor UnitÃ¡rio (R$) *</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={currentSupply.unitPrice || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, unitPrice: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* SeÃ§Ã£o de ResÃ­duos */}
                                <div className="border-t pt-4 mt-2">
                                    <Label className="mb-3 block font-semibold">GeraÃ§Ã£o de ResÃ­duos por Unidade (g)</Label>
                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="grid gap-1">
                                            <Label className="text-xs">PlÃ¡stico</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.plasticG || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, plasticG: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Papel/PapelÃ£o</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.paperG || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, paperG: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Metal</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.metalG || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, metalG: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Vidro</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.glassG || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, glassG: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleSave} className="w-full mt-4">
                                    {editingSupply ? 'Salvar AlteraÃ§Ãµes' : 'Criar Insumo'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    )}
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou cÃ³digo..."
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
                                    <TableHead>CÃ³digo</TableHead>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Unid. Faturamento</TableHead>
                                    <TableHead>Capacidade</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead className="text-right">AÃ§Ãµes</TableHead>
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
                                                    {supply.billingUnit === 'pack' ? 'Pacote' :
                                                        supply.billingUnit === 'box' ? 'Caixa' :
                                                            supply.billingUnit === 'other' ? 'Outros' : 'Unidade'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {supply.capacityMl ? `${supply.capacityMl} mL` : '-'}
                                            </TableCell>
                                            <TableCell>R$ {supply.unitPrice?.toFixed(2) || '0.00'}</TableCell>
                                            <TableCell className="text-right">
                                                {canManageSupplies && (
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(supply)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() => supply.id && handleDelete(supply.id)}
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
                    </CardContent>
                </Card>
            </div>
            <BottomNav />
        </div>
    );
};

export default Supplies;

