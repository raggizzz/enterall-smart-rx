import { RefreshCw, ServerCrash, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useConnectivityContext } from "@/components/ConnectivityProvider";
import { useSyncQueue } from "@/components/SyncQueueProvider";

const SyncStatusBadge = () => {
  const { isOnline, isServerReachable, isChecking, lastCheckedAt } = useConnectivityContext();
  const { pendingCount, failedCount, isSyncing } = useSyncQueue();

  if (!isOnline) {
    return (
      <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-600">
        <WifiOff className="h-3 w-3" />
        Offline{pendingCount > 0 ? ` (${pendingCount})` : ""}
      </Badge>
    );
  }

  if (!isServerReachable) {
    return (
      <Badge
        className="gap-1 bg-red-600 text-white hover:bg-red-700"
      title="A rede existe, mas a API da unidade nao respondeu."
      >
        <ServerCrash className="h-3 w-3" />
        Servidor indisponivel{pendingCount > 0 ? ` (${pendingCount})` : ""}
      </Badge>
    );
  }

  if (failedCount > 0) {
    return (
      <Badge
        className="gap-1 bg-red-600 text-white hover:bg-red-700"
        title="Ha operacoes com conflito ou falha que precisam de revisao."
      >
        <ServerCrash className="h-3 w-3" />
        Falha de sync ({failedCount})
      </Badge>
    );
  }

  if (pendingCount > 0 || isSyncing) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/40 bg-amber-500/10 text-amber-700"
        title={`${pendingCount} operacao(oes) pendente(s) para sincronizar`}
      >
        <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
        Pendentes ({pendingCount})
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
      title={lastCheckedAt ? `Ultima verificacao: ${lastCheckedAt.toLocaleTimeString("pt-BR")}` : "Conexao ativa"}
    >
      {isChecking ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
      Sincronizado
    </Badge>
  );
};

export default SyncStatusBadge;
