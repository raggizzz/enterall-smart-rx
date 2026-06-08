import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { discardIrrecoverableOperations, flushPendingOperations, getPendingOperations, hasStoredAccessToken, reactivateAuthenticationFailures } from "@/lib/offlineStore";
import { useConnectivityContext } from "@/components/ConnectivityProvider";
import { trackClientEvent } from "@/lib/observability";

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
  const isSyncingRef = useRef(false);
  const lastFailedCountRef = useRef(0);
  const failedToastCooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pendingCount = useLiveQuery(
    async () => (await getPendingOperations()).filter((operation) => operation.status === "pending").length,
    [],
    0,
  );
  const failedCount = useLiveQuery(
    async () => (await getPendingOperations()).filter((operation) => operation.status === "failed").length,
    [],
    0,
  );

  const syncNow = useCallback(async () => {
    if (isSyncingRef.current || !isOnline || !isServerReachable || !hasAuthToken) return;

    if (pendingCount === 0) {
      if (failedCount === 0) return;

      const reactivatedCount = await reactivateAuthenticationFailures();
      if (reactivatedCount === 0) {
        return;
      }
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    try {
      const reactivatedCount = await reactivateAuthenticationFailures();
      const result = await flushPendingOperations();
      setLastSyncAt(new Date());

      if (result.processed > 0) {
        toast.success(`${result.processed} operacao(oes) sincronizada(s) com a unidade.`);
        trackClientEvent("sync_queue_processed", { processed: result.processed, failed: result.failed });
      }

      if (reactivatedCount > 0 && result.processed === 0 && result.failed === 0) {
        toast.success("Fila de sincronizacao reativada apos renovar a sessao.");
      }

      if (result.failed > 0 && result.failed > lastFailedCountRef.current) {
        trackClientEvent("sync_queue_failed", { failed: result.failed });
        // Only toast when the failure count increases (new failures), not on every retry cycle
        if (failedToastCooldownRef.current) clearTimeout(failedToastCooldownRef.current);
        failedToastCooldownRef.current = setTimeout(() => {
          toast.error(`${result.failed} operacao(oes) precisam de revisao na Central Sync.`);
          lastFailedCountRef.current = result.failed;
          failedToastCooldownRef.current = null;
        }, 500);
      } else if (result.failed === 0) {
        lastFailedCountRef.current = 0;
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [failedCount, hasAuthToken, isOnline, isServerReachable, pendingCount]);

  // On mount: auto-discard irrecoverable operations left over from past sessions
  useEffect(() => {
    void discardIrrecoverableOperations();
  }, []);

  useEffect(() => {
    const syncAuthState = () => {
      setHasAuthToken(hasStoredAccessToken());
      // When a new session starts, also re-run cleanup
      void discardIrrecoverableOperations();
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
