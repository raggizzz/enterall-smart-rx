import { useEffect, useRef, useState } from "react";

const resolveHealthUrl = () => {
  const explicitUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (explicitUrl) {
    return `${explicitUrl.replace(/\/api\/?$/, "").replace(/\/$/, "")}/health`;
  }

  if (typeof window === "undefined") {
    return "http://localhost:3000/health";
  }

  if (import.meta.env.PROD) {
    return `${window.location.origin}/api/hospitals`;
  }

  const apiPort = (import.meta.env.VITE_API_PORT as string | undefined) || "3000";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${apiPort}/health`;
};

const HEALTH_URL = resolveHealthUrl();
const HEALTH_TIMEOUT_MS = 5000;
const HEALTH_INTERVAL_MS = 30000;

export interface ConnectivityState {
  isOnline: boolean;
  isServerReachable: boolean;
  isChecking: boolean;
  lastCheckedAt: Date | null;
  refresh: () => Promise<void>;
}

const checkServerHealth = async () => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(HEALTH_URL, {
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const useConnectivity = (): ConnectivityState => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = async () => {
    const online = typeof navigator === "undefined" ? true : navigator.onLine;
    if (!mountedRef.current) return;

    setIsOnline(online);
    if (!online) {
      setIsServerReachable(false);
      setIsChecking(false);
      setLastCheckedAt(new Date());
      return;
    }

    setIsChecking(true);
    const reachable = await checkServerHealth();
    if (!mountedRef.current) return;

    setIsServerReachable(reachable);
    setIsChecking(false);
    setLastCheckedAt(new Date());
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void refresh();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
      setIsChecking(false);
      setLastCheckedAt(new Date());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, HEALTH_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearInterval(intervalId);
    };
  }, []);

  return {
    isOnline,
    isServerReachable,
    isChecking,
    lastCheckedAt,
    refresh,
  };
};
