import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Utensils, Droplet, AlertCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";

// Mock Data for Oral Map
const oralMapData = [
    {
        bed: "01",
        patient: "Maria Silva",
        dob: "15/03/1955",
        diet: "Pastosa",
        thickener: "Néctar",
        supplements: [
            { name: "Nutridrink Protein", amount: "200ml", time: "10:00" },
            { name: "Glutamina", amount: "10g", time: "20:00" }
        ],
        observation: "Alergia a camarão. Oferecer água gelada."
    },
    {
        bed: "02",
        patient: "João Santos",
        dob: "20/08/1960",
        diet: "Livre",
        thickener: null,
        supplements: [],
        observation: "Diabético. Sem açúcar."
    },
    {
        bed: "03",
        patient: "Ana Costa",
        dob: "10/12/1980",
        diet: "Branda",
        thickener: null,
        supplements: [
            { name: "Fresubin 2kcal", amount: "200ml", time: "15:00" }
        ],
        observation: ""
    },
    {
        bed: "04",
        patient: "Pedro Alves",
        dob: "05/05/1975",
        diet: "Zero (Jejum)",
        thickener: null,
        supplements: [],
        observation: "Pré-operatório."
    }
];

const OralMap = () => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <Header />
            <div className="container py-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Mapa de Dieta Oral (Copa)</h1>
                        <p className="text-muted-foreground">Resumo para distribuição de dietas e suplementos</p>
                    </div>
                    <Button onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir Mapa
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {oralMapData.map((patient, index) => (
                        <Card key={index} className={`border-l-4 ${patient.diet.includes("Zero") ? "border-l-red-500" : "border-l-green-500"}`}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">Leito {patient.bed}</CardTitle>
                                        <p className="text-sm font-medium text-muted-foreground">{patient.patient}</p>
                                    </div>
                                    <Badge variant={patient.diet.includes("Zero") ? "destructive" : "default"}>
                                        {patient.diet}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {patient.thickener && (
                                    <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded text-blue-700">
                                        <Droplet className="h-4 w-4" />
                                        <span className="font-semibold">Espessante: {patient.thickener}</span>
                                    </div>
                                )}

                                {patient.supplements.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                            <Utensils className="h-3 w-3" /> Suplementos
                                        </p>
                                        <ul className="text-sm space-y-1">
                                            {patient.supplements.map((supp, i) => (
                                                <li key={i} className="flex justify-between border-b border-dashed pb-1 last:border-0">
                                                    <span>{supp.name}</span>
                                                    <span className="font-mono text-xs">{supp.amount} - {supp.time}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {patient.observation && (
                                    <div className="flex items-start gap-2 text-sm bg-yellow-50 p-2 rounded text-yellow-800">
                                        <AlertCircle className="h-4 w-4 mt-0.5" />
                                        <span>{patient.observation}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            <BottomNav />
        </div>
    );
};

export default OralMap;
