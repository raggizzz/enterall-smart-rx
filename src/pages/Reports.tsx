import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import BottomNav from "@/components/BottomNav";

const Reports = () => {
    const navigate = useNavigate();
    const [selectedPatient, setSelectedPatient] = useState("all");

    const patients = [
        { id: "1", name: "Antonio Pereira" },
        { id: "2", name: "Alicia Gomes" },
        { id: "3", name: "Renata Fortes" },
    ];

    // Mock data for the last 7 days
    const historyData = [
        { date: "20/11", volume: 1100, goal: 1500, percentage: 73 },
        { date: "21/11", volume: 1250, goal: 1500, percentage: 83 },
        { date: "22/11", volume: 1400, goal: 1500, percentage: 93 },
        { date: "23/11", volume: 1450, goal: 1500, percentage: 96 },
        { date: "24/11", volume: 1500, goal: 1500, percentage: 100 },
        { date: "25/11", volume: 1300, goal: 1500, percentage: 86 },
        { date: "26/11", volume: 1480, goal: 1500, percentage: 98 },
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
                <div className="container flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <span className="text-lg font-semibold">Relatórios</span>
                    </div>
                </div>
            </header>

            <div className="container px-4 py-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Histórico do Paciente</h1>
                        <p className="text-muted-foreground">Acompanhamento da meta nutricional (últimos 7 dias)</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Selecione o Paciente" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Visão Geral</SelectItem>
                                {patients.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Exportar
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Chart Card */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Adesão à Meta Nutricional (%)</CardTitle>
                            <CardDescription>Volume infundido vs Meta prescrita</CardDescription>
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
                                    <span className="font-bold text-lg">89.8%</span>
                                </div>
                                <div className="flex justify-between items-center border-b pb-2">
                                    <span className="text-muted-foreground">Dias na Meta ({">"}90%)</span>
                                    <span className="font-bold text-lg text-green-600">4 dias</span>
                                </div>
                                <div className="flex justify-between items-center border-b pb-2">
                                    <span className="text-muted-foreground">Dias Abaixo ({'<'}70%)</span>
                                    <span className="font-bold text-lg text-red-600">0 dias</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Total Infundido</span>
                                    <span className="font-bold text-lg">9,480 ml</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Intercurrences Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Principais Intercorrências</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-red-500" />
                                    <span className="flex-1">Jejum para Exame</span>
                                    <span className="font-medium">2 ocorrências</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                    <span className="flex-1">Vômitos</span>
                                    <span className="font-medium">1 ocorrência</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                                    <span className="flex-1">Pausa Procedimento</span>
                                    <span className="font-medium">1 ocorrência</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default Reports;
