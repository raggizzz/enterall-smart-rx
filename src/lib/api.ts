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

    const apiPort = (import.meta.env.VITE_API_PORT as string | undefined) || "3000";
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:${apiPort}/api`;
};

const API_URL = resolveApiUrl();

const parseResponseBody = async (res: Response) => {
    if (res.status === 204) {
        return null;
    }

    const contentLength = res.headers.get('content-length');
    if (contentLength === '0') {
        return null;
    }

    const text = await res.text();
    if (!text) {
        return null;
    }

    return JSON.parse(text);
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

export const getAuthHeaders = (extraHeaders?: Record<string, string>) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(extraHeaders || {}),
    };
    const session = localStorage.getItem('local_session');
    if (!session) return headers;
    const parsed = JSON.parse(session);
    if (parsed?.access_token) {
        headers.Authorization = `Bearer ${parsed.access_token}`;
    }
    return headers;
};

type ApiRequestOptions = {
    headers?: Record<string, string>;
};

const request = async (endpoint: string, init: RequestInit = {}, options?: ApiRequestOptions) => {
    const res = await fetch(`${API_URL}${endpoint}`, {
        ...init,
        headers: getAuthHeaders(options?.headers),
    });
    const body = await parseResponseBody(res);
    if (!res.ok) {
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
            method: 'POST',
            body: JSON.stringify(data)
        }, options);
    },

    async put(endpoint: string, data: any, options?: ApiRequestOptions) {
        return request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        }, options);
    },

    async delete(endpoint: string, options?: ApiRequestOptions) {
        return request(endpoint, {
            method: 'DELETE',
        }, options);
    }
};
