/**
 * EnterAll Smart RX - API Client
 * Replaces Supabase BaaS with local REST API calls.
 */

const resolveApiUrl = () => {
    const explicitUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (explicitUrl) {
        return explicitUrl.endsWith("/api") ? explicitUrl : `${explicitUrl.replace(/\/$/, "")}/api`;
    }

    if (typeof window === "undefined") {
        return "http://localhost:3000/api";
    }

    // In production we prefer a same-origin /api path so Vercel can proxy requests
    // to the backend via rewrites without exposing a hardcoded host in the bundle.
    if (import.meta.env.PROD) {
        return `${window.location.origin}/api`;
    }

    const apiPort = (import.meta.env.VITE_API_PORT as string | undefined) || "3000";
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${apiPort}/api`;
};

type StoredSession = {
    access_token?: string;
    refresh_token?: string;
};

type ApiRequestOptions = {
    headers?: Record<string, string>;
};

const API_URL = resolveApiUrl();
const SESSION_KEYS = [
    "local_session",
    "userRole",
    "userName",
    "userProfessionalId",
    "userHospitalId",
    "userHospitalName",
    "userWard",
] as const;
const SESSION_CHANGE_EVENT = "enmeta-session-updated";
const SESSION_REFRESH_WINDOW_MS = 10 * 60 * 1000;

let refreshInFlight: Promise<StoredSession | null> | null = null;

const parseResponseBody = async (res: Response) => {
    if (res.status === 204) {
        return null;
    }

    const contentLength = res.headers.get("content-length");
    if (contentLength === "0") {
        return null;
    }

    const text = await res.text();
    if (!text) {
        return null;
    }

    const contentType = res.headers.get("content-type") || "";
    const looksLikeJson = contentType.includes("application/json")
        || text.trim().startsWith("{")
        || text.trim().startsWith("[");

    if (!looksLikeJson) {
        return text;
    }

    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
};

const readStoredSession = (): StoredSession | null => {
    if (typeof window === "undefined") return null;

    const raw = localStorage.getItem("local_session");
    if (!raw) return null;

    try {
        return JSON.parse(raw) as StoredSession;
    } catch {
        return null;
    }
};

const writeStoredSession = (session: StoredSession) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("local_session", JSON.stringify(session));
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
};

const clearInvalidSession = () => {
    if (typeof window === "undefined") return;
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
};

const decodeJwtPayload = (token?: string): Record<string, unknown> | null => {
    if (!token || typeof window === "undefined") return null;

    const [, payload] = token.split(".");
    if (!payload) return null;

    try {
        const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
        return JSON.parse(window.atob(padded)) as Record<string, unknown>;
    } catch {
        return null;
    }
};

const getTokenExpirationMs = (token?: string): number | null => {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
};

const isTokenMissingOrExpiring = (token?: string) => {
    const expiration = getTokenExpirationMs(token);
    if (!expiration) return true;
    return expiration - Date.now() <= SESSION_REFRESH_WINDOW_MS;
};

const getBasicHeaders = (extraHeaders?: Record<string, string>) => ({
    "Content-Type": "application/json",
    ...(extraHeaders || {}),
});

const refreshSession = async (): Promise<StoredSession | null> => {
    if (typeof window === "undefined") return null;

    if (refreshInFlight) {
        return refreshInFlight;
    }

    refreshInFlight = (async () => {
        const currentSession = readStoredSession();
        const refreshToken = currentSession?.refresh_token;

        if (!refreshToken) {
            return null;
        }

        try {
            const response = await fetch(`${API_URL}/auth/refresh`, {
                method: "POST",
                headers: getBasicHeaders(),
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
            const body = await parseResponseBody(response);

            if (!response.ok) {
                clearInvalidSession();
                return null;
            }

            const nextSession = {
                ...(currentSession || {}),
                ...((body && typeof body === "object" && "session" in body)
                    ? (body as { session?: StoredSession }).session
                    : {}),
            };

            if (!nextSession.access_token) {
                clearInvalidSession();
                return null;
            }

            writeStoredSession(nextSession);
            return nextSession;
        } catch {
            return null;
        } finally {
            refreshInFlight = null;
        }
    })();

    return refreshInFlight;
};

const ensureValidSession = async (): Promise<StoredSession | null> => {
    const session = readStoredSession();
    if (!session) return null;

    if (isTokenMissingOrExpiring(session.access_token) && session.refresh_token) {
        return (await refreshSession()) || readStoredSession();
    }

    return session;
};

export class ApiError extends Error {
    status: number;
    body: unknown;

    constructor(message: string, status: number, body?: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
    }
}

export const getAuthHeaders = async (extraHeaders?: Record<string, string>) => {
    const headers: Record<string, string> = getBasicHeaders(extraHeaders);
    const session = await ensureValidSession();
    if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
};

const request = async (
    endpoint: string,
    init: RequestInit = {},
    options?: ApiRequestOptions,
    allowRetry = true,
) => {
    const headers = endpoint === "/auth/refresh"
        ? getBasicHeaders(options?.headers)
        : await getAuthHeaders(options?.headers);

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...init,
        headers,
    });
    const body = await parseResponseBody(res);

    if (!res.ok) {
        if (res.status === 401 && allowRetry && endpoint !== "/auth/login" && endpoint !== "/auth/refresh") {
            const refreshedSession = await refreshSession();
            if (refreshedSession?.access_token) {
                return request(endpoint, init, options, false);
            }
        }

        if (res.status === 401 && endpoint !== "/auth/login" && endpoint !== "/auth/refresh") {
            clearInvalidSession();
        }

        throw new ApiError(
            `API ${init.method || "GET"} Error: ${res.statusText}`,
            res.status,
            body,
        );
    }

    return body;
};

export const apiClient = {
    async request(endpoint: string, init?: RequestInit, options?: ApiRequestOptions) {
        return request(endpoint, init, options);
    },

    async get(endpoint: string, options?: ApiRequestOptions) {
        return request(endpoint, undefined, options);
    },

    async post(endpoint: string, data: any, options?: ApiRequestOptions) {
        return request(endpoint, {
            method: "POST",
            body: JSON.stringify(data),
        }, options);
    },

    async put(endpoint: string, data: any, options?: ApiRequestOptions) {
        return request(endpoint, {
            method: "PUT",
            body: JSON.stringify(data),
        }, options);
    },

    async delete(endpoint: string, options?: ApiRequestOptions) {
        return request(endpoint, {
            method: "DELETE",
        }, options);
    },
};
