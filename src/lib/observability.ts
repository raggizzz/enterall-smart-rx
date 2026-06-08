type ObservabilityProps = Record<string, string | number | boolean | null | undefined>;

const MAX_QUEUE_SIZE = 100;
const STORAGE_KEY = "enmeta-observability-queue";

const resolveTelemetryUrl = () => {
  const explicitUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (explicitUrl) {
    const base = explicitUrl.endsWith("/api") ? explicitUrl : `${explicitUrl.replace(/\/$/, "")}/api`;
    return `${base}/observability`;
  }

  if (typeof window === "undefined") return "/api/observability";
  if (import.meta.env.PROD) return `${window.location.origin}/api/observability`;

  const apiPort = (import.meta.env.VITE_API_PORT as string | undefined) || "3000";
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:${apiPort}/api/observability`;
};

const getSessionContext = () => {
  if (typeof window === "undefined") return {};
  return {
    role: localStorage.getItem("userRole") || undefined,
    hospitalId: localStorage.getItem("userHospitalId") || undefined,
    route: window.location.pathname,
  };
};

const normalizeValue = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value.slice(0, 160);
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value).slice(0, 160);
};

const normalizeProps = (props: ObservabilityProps = {}) =>
  Object.fromEntries(
    Object.entries(props)
      .map(([key, value]) => [key, normalizeValue(value)] as const)
      .filter(([, value]) => value !== undefined),
  );

const readQueue = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as unknown[] : [];
  } catch {
    return [];
  }
};

const writeQueue = (events: unknown[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_QUEUE_SIZE)));
};

const enqueue = (event: unknown) => {
  writeQueue([...readQueue(), event]);
};

const sendPayload = (payload: unknown, keepalive = true) => {
  const url = resolveTelemetryUrl();
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && navigator.sendBeacon && body.length < 60_000) {
    const sent = navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    if (sent) return Promise.resolve();
  }

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive,
  }).then((response) => {
    if (!response.ok) throw new Error(`observability ${response.status}`);
  });
};

export const trackClientEvent = (name: string, props: ObservabilityProps = {}) => {
  if (typeof window === "undefined") return;

  const event = {
    type: "event",
    name,
    timestamp: new Date().toISOString(),
    online: navigator.onLine,
    serverReachable: localStorage.getItem("enmeta-server-reachable") || undefined,
    ...getSessionContext(),
    props: normalizeProps(props),
  };

  void sendPayload(event).catch(() => enqueue(event));
};

export const trackClientError = (error: unknown, props: ObservabilityProps = {}) => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack?.slice(0, 800) : undefined;
  trackClientEvent("client_error", {
    ...props,
    message,
    stack,
  });
};

export const flushClientObservabilityQueue = () => {
  const queue = readQueue();
  if (queue.length === 0) return;

  void sendPayload({ type: "batch", events: queue }, false)
    .then(() => writeQueue([]))
    .catch(() => undefined);
};

export const installClientObservability = () => {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    trackClientError(event.error || event.message, {
      source: "window_error",
      filename: event.filename,
      line: event.lineno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    trackClientError(event.reason, { source: "unhandled_rejection" });
  });

  window.addEventListener("online", () => {
    trackClientEvent("browser_online");
    flushClientObservabilityQueue();
  });

  window.addEventListener("offline", () => {
    trackClientEvent("browser_offline");
  });

  window.addEventListener("visibilitychange", () => {
    trackClientEvent("visibility_change", { state: document.visibilityState });
  });

  window.addEventListener("load", () => {
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!navigation) return;

    trackClientEvent("page_performance", {
      loadMs: Math.round(navigation.loadEventEnd - navigation.startTime),
      domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd - navigation.startTime),
      transferSize: navigation.transferSize,
    });
    flushClientObservabilityQueue();
  });
};
