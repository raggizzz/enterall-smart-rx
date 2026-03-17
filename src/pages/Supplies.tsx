import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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

const toOptionalNumber = (value: unknown) => {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }

    if (typeof value === "string") {
        const normalized = value.replace(",", ".").trim();
        if (!normalized) return undefined;
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : undefined;
    }

    return undefined;
};

type SupplyFormState = Partial<Omit<Supply, 'capacityMl' | 'unitPrice' | 'plasticG' | 'paperG' | 'metalG' | 'glassG'>> & {
    capacityMl?: number | string;
    unitPrice?: number | string;
    plasticG?: number | string;
    paperG?: number | string;
    metalG?: number | string;
    glassG?: number | string;
};

const Supplies = () => {
    const { supplies, isLoading, createSupply, updateSupply, deleteSupply } = useSupplies();
    const role = useCurrentRole();
    const canManageSupplies = can(role, "manage_supplies");
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
    const [currentSupply, setCurrentSupply] = useState<SupplyFormState>({});

    const resetForm = () => {
        setCurrentSupply({});
        setEditingSupply(null);
    };

    const handleSave = async () => {
        if (!canManageSupplies) {
            toast.error("Sem permissão para gerenciar insumos");
            return;
        }

        if (!currentSupply.name || !currentSupply.code || !currentSupply.type) {
            toast.error("Preencha os campos obrigatórios");
            return;
        }

        try {
            const supplyData = {
                code: currentSupply.code!,
                name: currentSupply.name!,
                type: currentSupply.type!,
                category: 'standard' as const,
                billingUnit: 'unit' as const,
                capacityMl: currentSupply.type === 'bottle' ? toOptionalNumber(currentSupply.capacityMl) : undefined,
                unitPrice: toOptionalNumber(currentSupply.unitPrice) || 0,
                isBillable: true,
                plasticG: toOptionalNumber(currentSupply.plasticG),
                paperG: toOptionalNumber(currentSupply.paperG),
                metalG: toOptionalNumber(currentSupply.metalG),
                glassG: toOptionalNumber(currentSupply.glassG),
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
            toast.error("Sem permissão para editar insumos");
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
            toast.error("Sem permissão para excluir insumos");
            return;
        }

        if (!confirm("Tem certeza que deseja excluir este insumo?")) return;

        try {
            await deleteSupply(id);
            toast.success("Insumo excluído com sucesso!");
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
                                <DialogDescription>
                                    Cadastre apenas os dados necessários para frascos, equipos e outros insumos.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Código *</Label>
                                        <Input
                                            placeholder="Ex: FR100"
                                            value={currentSupply.code || ''}
                                            onChange={e => setCurrentSupply({ ...currentSupply, code: e.target.value })}
                                        />
                                    </div>
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
                                </div>

                                <div className="grid gap-2">
                                    <Label>Nome do Produto *</Label>
                                    <Input
                                        placeholder="Ex: Frasco Biobase 100"
                                        value={currentSupply.name || ''}
                                        onChange={e => setCurrentSupply({ ...currentSupply, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentSupply.type === 'bottle' && (
                                        <div className="grid gap-2">
                                            <Label>Capacidade (mL)</Label>
                                            <Input
                                                type="number"
                                                placeholder="Ex: 100"
                                                value={currentSupply.capacityMl || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, capacityMl: e.target.value })}
                                            />
                                        </div>
                                    )}
                                    <div className="grid gap-2">
                                        <Label>Valor Unitário (R$)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={currentSupply.unitPrice || ''}
                                            onChange={e => setCurrentSupply({ ...currentSupply, unitPrice: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="border-t pt-4 mt-2 space-y-3">
                                    <Label className="block font-semibold">Informações sobre resíduo gerado por unidade (g)</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Plástico</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.plasticG || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, plasticG: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Papel</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.paperG || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, paperG: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Metal</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.metalG || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, metalG: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-1">
                                            <Label className="text-xs">Vidro</Label>
                                            <Input
                                                type="number"
                                                className="h-9"
                                                placeholder="0"
                                                value={currentSupply.glassG || ''}
                                                onChange={e => setCurrentSupply({ ...currentSupply, glassG: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button onClick={handleSave} className="w-full mt-4">
                                    {editingSupply ? 'Salvar Alterações' : 'Criar Insumo'}
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
                                    <TableHead>Capacidade</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Resíduos</TableHead>
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
                                                {supply.capacityMl ? `${supply.capacityMl} mL` : '-'}
                                            </TableCell>
                                            <TableCell>R$ {supply.unitPrice?.toFixed(2) || '0.00'}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {[
                                                    supply.plasticG ? `Plástico ${supply.plasticG}g` : undefined,
                                                    supply.paperG ? `Papel ${supply.paperG}g` : undefined,
                                                    supply.metalG ? `Metal ${supply.metalG}g` : undefined,
                                                    supply.glassG ? `Vidro ${supply.glassG}g` : undefined,
                                                ].filter(Boolean).join(' | ') || '-'}
                                            </TableCell>
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

