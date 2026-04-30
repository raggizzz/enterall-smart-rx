/**
 * DeliveryProtocol - Modulo 8
 * Protocolo diario de entrega para impressao.
 * Restrito via RBAC (somente tecnico+ pode gerar).
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Printer, ShieldCheck } from "lucide-react";
import { can, getCurrentRole } from "@/lib/permissions";
import { toast } from "sonner";
import { compareBedLabels } from "@/lib/patientDisplay";
import { useSettings } from "@/hooks/useDatabase";
import { printElementInPopup } from "@/lib/printPopup";

interface ProtocolItem {
  ward: string;
  bed: string;
  patientName: string;
  systemType: string;
  formulaName: string;
  billedAmount: string;
  scheduleTime: string;
}

interface DeliveryProtocolProps {
  unitName: string;
  date: string;
  items: ProtocolItem[];
  signatures?: {
    technician?: string;
    prescriber?: string;
  };
}

const DeliveryProtocol = ({ unitName, date, items, signatures }: DeliveryProtocolProps) => {
  const role = getCurrentRole();
  const { settings } = useSettings();
  const canGenerate = can(role, "manage_billing") || can(role, "manage_labels");

  const groupedByWard = useMemo(() => {
    const map = new Map<string, Map<string, ProtocolItem[]>>();
    items.forEach((item) => {
      const ward = item.ward || "Sem setor";
      const time = item.scheduleTime || "-";
      const wardMap = map.get(ward) || new Map<string, ProtocolItem[]>();
      const existing = wardMap.get(time) || [];
      existing.push(item);
      wardMap.set(time, existing);
      map.set(ward, wardMap);
    });
    return map;
  }, [items]);

  const handlePrint = () => {
    if (!canGenerate) {
      toast.error("Sem permissao para gerar o protocolo de entrega. Solicite acesso ao gestor.");
      return;
    }
    printElementInPopup("delivery-protocol-print", "Protocolo diario de entrega");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!canGenerate || items.length === 0}>
          <FileText className="h-4 w-4 mr-2" />
          Protocolo de Entrega
          {!canGenerate && <ShieldCheck className="h-3 w-3 ml-1 text-muted-foreground" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Protocolo Diario de Entrega
          </DialogTitle>
          <DialogDescription>
            Unidade: {unitName} - Data: {date}
          </DialogDescription>
        </DialogHeader>

        <div id="delivery-protocol-print" className="space-y-4">
          <div className="text-center border-b pb-3 print:block hidden">
            <h1 className="text-xl font-bold uppercase">{settings?.hospitalName || "Hospital nao informado"}</h1>
            <h2 className="text-lg font-bold uppercase mt-1">Protocolo de Entrega de Dietas Enterais</h2>
            <p className="text-sm">{unitName} - {date}</p>
          </div>

          {Array.from(groupedByWard.entries()).map(([ward, timesMap]) => (
            Array.from(timesMap.entries()).map(([time, wardItems]) => (
              <Card key={`${ward}-${time}`} className="print:shadow-none print:border print:break-inside-avoid">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm">
                    Unidade: {settings?.hospitalName || "Hospital nao informado"} | Ala: {ward} | Horário: {time}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs py-1">Leito</TableHead>
                        <TableHead className="text-xs py-1">Paciente</TableHead>
                        <TableHead className="text-xs py-1">Sistema</TableHead>
                        <TableHead className="text-xs py-1">Dieta</TableHead>
                        <TableHead className="text-xs py-1">Volume total / faturado</TableHead>
                        <TableHead className="text-xs py-1 w-[120px]">Responsável pela entrega</TableHead>
                        <TableHead className="text-xs py-1 w-[120px]">Recebido por</TableHead>
                        <TableHead className="text-xs py-1 w-[90px]">Horário receb.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wardItems
                        .sort((a, b) => compareBedLabels(a.bed, b.bed) || a.patientName.localeCompare(b.patientName))
                        .map((item, idx) => (
                          <TableRow key={`${item.bed}-${item.scheduleTime}-${idx}`}>
                            <TableCell className="text-xs py-1 font-medium">{item.bed}</TableCell>
                            <TableCell className="text-xs py-1 truncate max-w-[140px]">{item.patientName}</TableCell>
                            <TableCell className="text-xs py-1">
                              {item.systemType === "closed" ? "Fechado" : "Aberto"}
                            </TableCell>
                            <TableCell className="text-xs py-1 truncate max-w-[150px]">{item.formulaName}</TableCell>
                            <TableCell className="text-xs py-1">{item.billedAmount}</TableCell>
                            <TableCell className="text-xs py-1"><div className="border-b border-dashed border-gray-400 h-4 w-full" /></TableCell>
                            <TableCell className="text-xs py-1"><div className="border-b border-dashed border-gray-400 h-4 w-full" /></TableCell>
                            <TableCell className="text-xs py-1"><div className="border-b border-dashed border-gray-400 h-4 w-full" /></TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          ))}

          <div className="pt-6 grid grid-cols-3 gap-8 text-center text-xs print:block">
            <div className="border-t border-black pt-1">
              <p className="font-medium">Responsável pela entrega</p>
              <p className="text-muted-foreground">{signatures?.technician || "____________________"}</p>
            </div>
            <div className="border-t border-black pt-1">
              <p className="font-medium">Recebido por</p>
              <p className="text-muted-foreground">____________________</p>
            </div>
            <div className="border-t border-black pt-1">
              <p className="font-medium">Horário do recebimento</p>
              <p className="text-muted-foreground">____________________</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Protocolo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryProtocol;
