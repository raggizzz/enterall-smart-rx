import { useMemo, useState } from "react";
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
import { discardAllOperations, discardPendingOperation, getPendingOperations, retryPendingOperation, type PendingOperation } from "@/lib/offlineStore";
import { useSyncQueue } from "@/components/SyncQueueProvider";
import { toast } from "sonner";

const SyncCenterDialog = () => {
  const { pendingCount, failedCount, isSyncing, lastSyncAt, syncNow } = useSyncQueue();
  const [isDiscarding, setIsDiscarding] = useState(false);
  const totalCount = (pendingCount ?? 0) + (failedCount ?? 0);

  const handleDiscardAll = async () => {
    if (!window.confirm(`Descartar todas as ${totalCount} operacao(oes) da fila? Esta acao nao pode ser desfeita.`)) return;
    setIsDiscarding(true);
    try {
      const removed = await discardAllOperations();
      toast.success(`${removed} operacao(oes) descartada(s) da fila.`);
    } finally {
      setIsDiscarding(false);
    }
  };
  const operations = useLiveQuery(
    async () => (await getPendingOperations()).slice().reverse(),
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

  const classifyOperationError = (operation: PendingOperation) => {
    const errorText = (operation.lastError || "").toLowerCase();

    if (/token|sess[aã]o expirada|autentica/i.test(errorText)) {
      return {
        canRetry: true,
        hint: "Refaca o login e sincronize novamente.",
      };
    }

    if (/formula not found|module not found|supply not found|patient not found|professional not found|prescription not found|hospital not found|ward not found/.test(errorText)) {
      return {
        canRetry: false,
        hint: "A referencia original nao existe mais. Descarte esta operacao e refaca com os dados atuais.",
      };
    }

    if (/version conflict|conflito de versao/.test(errorText)) {
      return {
        canRetry: false,
        hint: "Os dados mudaram em outro aparelho. Atualize a tela e refaca a alteracao na versao atual.",
      };
    }

    if (/doctype|is not valid json|unexpected token/.test(errorText)) {
      return {
        canRetry: false,
        hint: "Falha antiga de resposta invalida. Se a operacao ainda for necessaria, refaca no cadastro atual; senao, descarte.",
      };
    }

    return {
      canRetry: true,
      hint: undefined,
    };
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
          <Button onClick={() => void syncNow()} disabled={isSyncing || totalCount === 0}>
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            Sincronizar agora
          </Button>
          {totalCount > 0 && (
            <Button
              variant="destructive"
              onClick={() => void handleDiscardAll()}
              disabled={isDiscarding || isSyncing}
            >
              <Trash2 className="h-4 w-4" />
              Descartar tudo ({totalCount})
            </Button>
          )}
        </div>

        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {operations.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhuma operacao pendente.
            </div>
          ) : (
            operations.map((operation) => (
              (() => {
                const resolution = classifyOperationError(operation);
                return (
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
                    {resolution.hint && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {resolution.hint}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void retryPendingOperation(operation.queueId)}
                      disabled={!resolution.canRetry}
                    >
                      Reenfileirar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void discardPendingOperation(operation.queueId)}>
                      <Trash2 className="h-4 w-4" />
                      Descartar
                    </Button>
                  </div>
                </div>
              </div>
                );
              })()
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SyncCenterDialog;
