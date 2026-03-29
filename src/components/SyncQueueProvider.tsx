import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { hasStoredAccessToken, offlineDb, flushPendingOperations, reactivateAuthenticationFailures } from "@/lib/offlineStore";
import { useConnectivityContext } from "@/components/ConnectivityProvider";

interface SyncQueueContextValue {
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncNow: () => Promise<void>;
}

const SyncQueueContext = createContext<SyncQueueContextValue | null>(null);

export const useSyncQueue = () => {
  const value = useContext(SyncQueueContext);
  if (!value) {
    throw new Error("useSyncQueue must be used within SyncQueueProvider");
  }
  return value;
};

interface SyncQueueProviderProps {
  children: ReactNode;
}

const SYNC_INTERVAL_MS = 15000;
const SESSION_CHANGE_EVENT = "enmeta-session-updated";

const SyncQueueProvider = ({ children }: SyncQueueProviderProps) => {
  const { isOnline, isServerReachable } = useConnectivityContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [hasAuthToken, setHasAuthToken] = useState(() => hasStoredAccessToken());

  const pendingCount = useLiveQuery(
    async () => offlineDb.pendingOperations.where("status").equals("pending").count(),
    [],
    0,
  );
  const failedCount = useLiveQuery(
    async () => offlineDb.pendingOperations.where("status").equals("failed").count(),
    [],
    0,
  );

  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline || !isServerReachable || !hasAuthToken) return;

    setIsSyncing(true);
    try {
      const reactivatedCount = await reactivateAuthenticationFailures();
      const result = await flushPendingOperations();
      setLastSyncAt(new Date());

      if (result.processed > 0) {
        toast.success(`${result.processed} operacao(oes) sincronizada(s) com a unidade.`);
      }

      if (reactivatedCount > 0 && result.processed === 0 && result.failed === 0) {
        toast.success("Fila de sincronizacao reativada apos renovar a sessao.");
      }

      if (result.failed > 0) {
        toast.error(`${result.failed} operacao(oes) precisam de revisao na Central Sync.`);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [hasAuthToken, isSyncing, isOnline, isServerReachable]);

  useEffect(() => {
    const syncAuthState = () => {
      setHasAuthToken(hasStoredAccessToken());
    };

    syncAuthState();
    window.addEventListener(SESSION_CHANGE_EVENT, syncAuthState);
    return () => window.removeEventListener(SESSION_CHANGE_EVENT, syncAuthState);
  }, []);

  useEffect(() => {
    if (!isOnline || !isServerReachable || !hasAuthToken) return;
    void syncNow();

    const intervalId = window.setInterval(() => {
      void syncNow();
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [hasAuthToken, isOnline, isServerReachable, syncNow]);

  const value = useMemo(
    () => ({
      pendingCount,
      failedCount,
      isSyncing,
      lastSyncAt,
      syncNow,
    }),
    [failedCount, isSyncing, lastSyncAt, pendingCount, syncNow],
  );

  return <SyncQueueContext.Provider value={value}>{children}</SyncQueueContext.Provider>;
};

export default SyncQueueProvider;
