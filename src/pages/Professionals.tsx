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
import { Plus, Search, UserCog, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

interface Professional {
    id: string;
    name: string;
    role: 'manager' | 'nutritionist' | 'technician';
    registration_number: string;
    cpf: string;
    crn?: string;
    managing_unit?: string;
}

const Professionals = () => {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentProfessional, setCurrentProfessional] = useState<Partial<Professional>>({});

    useEffect(() => {
        fetchProfessionals();
    }, []);

    const fetchProfessionals = async () => {
        setIsLoading(true);
        try {
            // Check if Supabase is configured
            if (!import.meta.env.VITE_SUPABASE_URL) {
                // Mock data if no backend
                setProfessionals([
                    { id: '1', name: 'Ana Silva', role: 'nutritionist', registration_number: '12345', cpf: '111.222.333-44', crn: 'CRN-1234' },
                    { id: '2', name: 'Carlos Souza', role: 'technician', registration_number: '67890', cpf: '555.666.777-88' },
                ]);
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('professionals')
                .select('*')
                .order('name');

            if (error) throw error;
            setProfessionals(data || []);
        } catch (error) {
            console.error('Error fetching professionals:', error);
            toast.error("Erro ao carregar profissionais");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!currentProfessional.name || !currentProfessional.role || !currentProfessional.registration_number) {
            toast.error("Preencha os campos obrigatórios");
            return;
        }

        try {
            if (!import.meta.env.VITE_SUPABASE_URL) {
                // Mock save
                if (currentProfessional.id) {
                    setProfessionals(professionals.map(p => p.id === currentProfessional.id ? { ...p, ...currentProfessional } as Professional : p));
                } else {
                    setProfessionals([...professionals, { ...currentProfessional, id: Date.now().toString() } as Professional]);
                }
                toast.success("Profissional salvo (Mock)");
                setIsDialogOpen(false);
                return;
            }

            if (currentProfessional.id) {
                const { error } = await supabase
                    .from('professionals')
                    .update(currentProfessional)
                    .eq('id', currentProfessional.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('professionals')
                    .insert([currentProfessional]);
                if (error) throw error;
            }

            toast.success("Profissional salvo com sucesso!");
            setIsDialogOpen(false);
            fetchProfessionals();
        } catch (error) {
            console.error('Error saving professional:', error);
            toast.error("Erro ao salvar profissional");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este profissional?")) return;

        try {
            if (!import.meta.env.VITE_SUPABASE_URL) {
                setProfessionals(professionals.filter(p => p.id !== id));
                toast.success("Profissional excluído (Mock)");
                return;
            }

            const { error } = await supabase.from('professionals').delete().eq('id', id);
            if (error) throw error;

            toast.success("Profissional excluído com sucesso!");
            fetchProfessionals();
        } catch (error) {
            console.error('Error deleting professional:', error);
            toast.error("Erro ao excluir profissional");
        }
    };

    const filteredProfessionals = professionals.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.registration_number.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
                        <p className="text-muted-foreground">Gerencie a equipe da unidade</p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => setCurrentProfessional({})}>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Profissional
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{currentProfessional.id ? 'Editar' : 'Novo'} Profissional</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Nome Completo *</Label>
                                    <Input
                                        value={currentProfessional.name || ''}
                                        onChange={e => setCurrentProfessional({ ...currentProfessional, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Função *</Label>
                                        <Select
                                            value={currentProfessional.role}
                                            onValueChange={(val: any) => setCurrentProfessional({ ...currentProfessional, role: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="manager">Gestor</SelectItem>
                                                <SelectItem value="nutritionist">Nutricionista</SelectItem>
                                                <SelectItem value="technician">Técnico</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Matrícula *</Label>
                                        <Input
                                            value={currentProfessional.registration_number || ''}
                                            onChange={e => setCurrentProfessional({ ...currentProfessional, registration_number: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>CPF</Label>
                                        <Input
                                            value={currentProfessional.cpf || ''}
                                            onChange={e => setCurrentProfessional({ ...currentProfessional, cpf: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>CRN (se aplicável)</Label>
                                        <Input
                                            value={currentProfessional.crn || ''}
                                            onChange={e => setCurrentProfessional({ ...currentProfessional, crn: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleSave} className="w-full mt-4">Salvar</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <Card>
                    <CardHeader className="pb-3">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou matrícula..."
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
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead>Matrícula</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell>
                                    </TableRow>
                                ) : filteredProfessionals.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            Nenhum profissional encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProfessionals.map((professional) => (
                                        <TableRow key={professional.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <UserCog className="h-4 w-4 text-muted-foreground" />
                                                    {professional.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {professional.role === 'manager' ? 'Gestor' :
                                                    professional.role === 'nutritionist' ? 'Nutricionista' : 'Técnico'}
                                            </TableCell>
                                            <TableCell>{professional.registration_number}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        setCurrentProfessional(professional);
                                                        setIsDialogOpen(true);
                                                    }}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(professional.id)}>
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

export default Professionals;
