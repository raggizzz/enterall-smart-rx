import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, Users, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { usePatients, useEvolutions } from "@/hooks/useDatabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Reports = () => {
    const navigate = useNavigate();
    const { patients, isLoading } = usePatients();
    const [selectedPatient, setSelectedPatient] = useState("all");

    // Filtrar pacientes ativos
    const activePatients = useMemo(() => {
        return patients.filter(p => p.status === 'active');
    }, [patients]);

    // Calcular estatísticas gerais
    const statistics = useMemo(() => {
        const total = activePatients.length;
        const byType = {
            oral: activePatients.filter(p => p.nutritionType === 'oral').length,
            enteral: activePatients.filter(p => p.nutritionType === 'enteral').length,
            parenteral: activePatients.filter(p => p.nutritionType === 'parenteral').length,
            jejum: activePatients.filter(p => p.nutritionType === 'jejum').length,
        };
        return { total, byType };
    }, [activePatients]);

    const { evolutions, isLoading: evolutionsLoading } = useEvolutions();

    // Filtro de Data
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

    // Filtrar evoluções por data e paciente
    const filteredEvolutions = useMemo(() => {
        return evolutions.filter(evo => {
            const evoDate = evo.date;
            const matchesDate = evoDate >= startDate && evoDate <= endDate;
            const matchesPatient = selectedPatient === 'all' || evo.patientId === selectedPatient;
            return matchesDate && matchesPatient;
        });
    }, [evolutions, startDate, endDate, selectedPatient]);

    // Dados para o gráfico agrupados por data
    const historyData = useMemo(() => {
        const grouped: Record<string, { date: string, volume: number, count: number, totalPct: number }> = {};

        // Inicializar datas no intervalo
        const start = new Date(startDate);
        const end = new Date(endDate);
        const loop = new Date(start);

        while (loop <= end) {
            const dayStr = loop.toISOString().split('T')[0];
            const displayDate = `${loop.getDate().toString().padStart(2, '0')}/${(loop.getMonth() + 1).toString().padStart(2, '0')}`;
            grouped[dayStr] = { date: displayDate, volume: 0, count: 0, totalPct: 0 };
            loop.setDate(loop.getDate() + 1);
        }

        filteredEvolutions.forEach(evo => {
            const dayStr = evo.date;
            if (grouped[dayStr]) {
                grouped[dayStr].volume += evo.volumeInfused || 0;
                grouped[dayStr].totalPct += evo.metaReached || 0;
                grouped[dayStr].count += 1;
            }
        });

        return Object.values(grouped).map(item => ({
            date: item.date,
            volume: item.volume,
            percentage: item.count > 0 ? Math.round(item.totalPct / item.count) : 0
        }));
    }, [filteredEvolutions, startDate, endDate]);

    // Calcular resumo do período filtrado
    const summary = useMemo(() => {
        const totalEvolutions = filteredEvolutions.length;
        if (totalEvolutions === 0) return { avgPercentage: "0.0", daysOnGoal: 0, daysBelow: 0, totalVolume: 0 };

        const avgPercentage = filteredEvolutions.reduce((sum, d) => sum + (d.metaReached || 0), 0) / totalEvolutions;
        const daysOnGoal = filteredEvolutions.filter(d => (d.metaReached || 0) >= 90).length;
        const daysBelow = filteredEvolutions.filter(d => (d.metaReached || 0) < 70).length;
        const totalVolume = filteredEvolutions.reduce((sum, d) => sum + (d.volumeInfused || 0), 0);

        return { avgPercentage: avgPercentage.toFixed(1), daysOnGoal, daysBelow, totalVolume };
    }, [filteredEvolutions]);

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />

            <div className="container px-4 py-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Relatórios</h1>
                        <p className="text-muted-foreground">Acompanhamento da meta nutricional</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Selecione o Paciente" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Visão Geral</SelectItem>
                                {activePatients.map(p => (
                                    <SelectItem key={p.id} value={p.id || ''}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex gap-2 items-end">
                        <div className="space-y-1">
                            <Label className="text-xs">Início</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-[140px]"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Fim</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-[140px]"
                            />
                        </div>
                        <Button variant="outline" className="mb-[1px]">
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Carregando dados...</p>
                    </div>
                ) : activePatients.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Nenhum paciente ativo encontrado</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Cadastre pacientes para visualizar relatórios
                            </p>
                            <Button className="mt-4" onClick={() => navigate('/patients')}>
                                Ir para Pacientes
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Estatísticas Rápidas */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary">{statistics.total}</p>
                                        <p className="text-sm text-muted-foreground">Pacientes Ativos</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-green-600">{statistics.byType.oral}</p>
                                        <p className="text-sm text-muted-foreground">Dieta Oral</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-purple-600">{statistics.byType.enteral}</p>
                                        <p className="text-sm text-muted-foreground">TNE</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-orange-600">{statistics.byType.parenteral}</p>
                                        <p className="text-sm text-muted-foreground">TNP</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Chart Card */}
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5" />
                                        Adesão à Meta Nutricional (%)
                                    </CardTitle>
                                    <CardDescription>Volume infundido vs Meta prescrita (últimos 7 dias)</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={historyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis unit="%" />
                                            <Tooltip />
                                            <ReferenceLine y={100} stroke="#22c55e" strokeDasharray="3 3" label="Meta" />
                                            <Bar dataKey="percentage" fill="#3b82f6" name="% Atingido" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Details Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Resumo do Período</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-muted-foreground">Média de Adequação</span>
                                            <span className="font-bold text-lg">{summary.avgPercentage}%</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-muted-foreground">Evoluções na Meta ({">"}90%)</span>
                                            <span className="font-bold text-lg text-green-600">{summary.daysOnGoal}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b pb-2">
                                            <span className="text-muted-foreground">Evoluções Abaixo ({'<'}70%)</span>
                                            <span className="font-bold text-lg text-red-600">{summary.daysBelow}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Total Infundido</span>
                                            <span className="font-bold text-lg">{summary.totalVolume.toLocaleString()} ml</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Type Distribution */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Distribuição por Tipo</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full bg-green-500" />
                                            <span className="flex-1">Dieta Oral</span>
                                            <span className="font-medium">{statistics.byType.oral} pacientes</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full bg-purple-500" />
                                            <span className="flex-1">Terapia Nutricional Enteral</span>
                                            <span className="font-medium">{statistics.byType.enteral} pacientes</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full bg-orange-500" />
                                            <span className="flex-1">Terapia Nutricional Parenteral</span>
                                            <span className="font-medium">{statistics.byType.parenteral} pacientes</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full bg-red-500" />
                                            <span className="flex-1">Jejum</span>
                                            <span className="font-medium">{statistics.byType.jejum} pacientes</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>

            <BottomNav />
        </div>
    );
};

export default Reports;
