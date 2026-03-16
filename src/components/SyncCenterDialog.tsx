import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, RefreshCw, ShieldAlert, Trash2, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { offlineDb, discardPendingOperation, retryPendingOperation, type PendingOperation } from "@/lib/offlineStore";
import { useSyncQueue } from "@/components/SyncQueueProvider";

const SyncCenterDialog = () => {
  const { pendingCount, failedCount, isSyncing, lastSyncAt, syncNow } = useSyncQueue();
  const operations = useLiveQuery(
    async () => offlineDb.pendingOperations.orderBy("createdAt").reverse().toArray(),
    [],
    [],
  );

  const summary = useMemo(() => {
    if (failedCount > 0) return "Conflitos ou falhas exigem revisao manual.";
    if (pendingCount > 0) return "Ha operacoes aguardando sincronizacao com a unidade.";
    return "Tudo sincronizado neste aparelho.";
  }, [failedCount, pendingCount]);

  const getOperationLabel = (operation: PendingOperation) => {
    const actionLabel = {
      create: "Criacao",
      update: "Atualizacao",
      delete: "Remocao",
    }[operation.action];

    return `${actionLabel} de ${operation.entityType}`;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Wifi className="h-4 w-4" />
          Central Sync
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Central de sincronizacao</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pendentes</p>
            <p className="mt-1 text-2xl font-semibold">{pendingCount}</p>
          </div>
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Falhas</p>
            <p className="mt-1 text-2xl font-semibold">{failedCount}</p>
          </div>
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ultimo sync</p>
            <p className="mt-1 text-sm font-medium">
              {lastSyncAt ? lastSyncAt.toLocaleString("pt-BR") : "Ainda nao executado"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void syncNow()} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            Sincronizar agora
          </Button>
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {operations.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma operacao pendente.
            </div>
          ) : (
            operations.map((operation) => (
              <div key={operation.queueId} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{getOperationLabel(operation)}</p>
                      <Badge variant={operation.status === "failed" ? "destructive" : "secondary"}>
                        {operation.status === "failed" ? "Falhou" : operation.status === "processing" ? "Processando" : "Pendente"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {operation.endpoint} | Tentativas: {operation.attemptCount}
                    </p>
                    {operation.lastError && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                        {operation.lastError.includes("conflito") ? (
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span>{operation.lastError}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => void retryPendingOperation(operation.queueId)}>
                      Reenfileirar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void discardPendingOperation(operation.queueId)}>
                      <Trash2 className="h-4 w-4" />
                      Descartar
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncCenterDialog;
