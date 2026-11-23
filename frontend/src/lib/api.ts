/**
 * The ONLY place the frontend talks to the backend API.
 * Components import functions from here — never call fetch directly.
 */

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/+$/, "");

export type Role = "student" | "staff" | "admin";

export type User = {
  id: number;
  username: string;
  email: string;
  role: Role;
};

export type Tokens = { access: string; refresh: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(`API request failed with status ${status}`);
    this.name = "ApiError";
  }
}

// --- Token storage -----------------------------------------------------------

const ACCESS_KEY = "agape.access";
const REFRESH_KEY = "agape.refresh";

/** Browser-only token store; safe to call during SSR (returns null / no-ops). */
export const tokenStore = {
  get(): Tokens | null {
    try {
      if (typeof window === "undefined") return null;
      const access = window.localStorage.getItem(ACCESS_KEY);
      const refresh = window.localStorage.getItem(REFRESH_KEY);
      return access && refresh ? { access, refresh } : null;
    } catch {
      return null;
    }
  },
  set(tokens: Tokens): void {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(ACCESS_KEY, tokens.access);
      window.localStorage.setItem(REFRESH_KEY, tokens.refresh);
    } catch {
      // Storage unavailable (private mode, blocked) — session won't persist.
    }
  },
  clear(): void {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(ACCESS_KEY);
      window.localStorage.removeItem(REFRESH_KEY);
    } catch {
      // ignore
    }
  },
};

// --- Core request ------------------------------------------------------------

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** Attach the access token and refresh it on 401. Default: true. */
  auth?: boolean;
};

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function send(path: string, { method = "GET", body }: RequestOptions, accessToken?: string) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// Share one in-flight refresh between concurrent 401s.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const tokens = tokenStore.get();
  if (!tokens) return null;
  refreshing ??= (async () => {
    try {
      const res = await send("/api/auth/token/refresh/", { method: "POST", body: { refresh: tokens.refresh } });
      if (!res.ok) {
        tokenStore.clear();
        return null;
      }
      const data = (await parseBody(res)) as { access: string; refresh?: string };
      // simplejwt only returns a new refresh token when rotation is enabled.
      tokenStore.set({ access: data.access, refresh: data.refresh ?? tokens.refresh });
      return data.access;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth ?? true;
  let res = await send(path, options, useAuth ? tokenStore.get()?.access : undefined);

  if (res.status === 401 && useAuth && tokenStore.get()) {
    const newAccess = await refreshAccessToken();
    if (newAccess) res = await send(path, options, newAccess);
  }

  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

// --- Endpoints ---------------------------------------------------------------

export function getHealth() {
  return apiFetch<{ status: string }>("/api/health/", { auth: false });
}

/** Logs in, stores the tokens, and returns the user's role for routing. */
export async function login(username: string, password: string): Promise<Role> {
  const data = await apiFetch<Tokens & { role: Role }>("/api/auth/token/", {
    method: "POST",
    body: { username, password },
    auth: false,
  });
  tokenStore.set({ access: data.access, refresh: data.refresh });
  return data.role;
}

export function logout(): void {
  tokenStore.clear();
}

export function isLoggedIn(): boolean {
  return tokenStore.get() !== null;
}

export function getMe() {
  return apiFetch<User>("/api/auth/me/");
}
