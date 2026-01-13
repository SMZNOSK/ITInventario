 "use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

export type AppRole = "ADMIN" | "ALMACEN" | "INGENIERO";

export type AuthUser = {
  id: number;
  username: string;
  name: string;
  role: AppRole;
  status?: string;
  hotels: number[];
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  login: (
    username: string,
    password: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
  hasRole: (...roles: AppRole[]) => boolean;
  fetchJSON: <T = any>(input: RequestInfo | URL, init?: RequestInit) => Promise<T>;
};

const AuthCtx = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "inventario.auth.token";
const LOGIN_URL = "/api/auth/login";
const ME_URL = "/api/auth/me";
const LOGOUT_URL = "/api/auth/logout";

function sanitizeToken(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  const low = t.toLowerCase();
  if (low === "null" || low === "undefined") return null;
  return t;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t =
      typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
    const clean = sanitizeToken(t);
    if (clean) setToken(clean);
    setLoading(false);
  }, []);

  useEffect(() => {
    let aborted = false;
    async function loadMe() {
      try {
        const clean = sanitizeToken(token);
        const headers: HeadersInit = clean ? { Authorization: `Bearer ${clean}` } : {};

        const r = await fetch(ME_URL, {
          headers,
          credentials: "include",
          cache: "no-store",
        });

        if (!r.ok) throw new Error(String(r.status));

        const json = await r.json();
        const u: AuthUser | undefined = (json.user ?? json) as any;
        if (!aborted) setUser(u ?? null);
      } catch {
        try {
          window.localStorage.removeItem(TOKEN_KEY);
        } catch {}
        if (!aborted) {
          setToken(null);
          setUser(null);
        }
      }
    }

    loadMe();
    return () => {
      aborted = true;
    };
  }, [token]);

  const fetchJSON = useCallback(
    async <T,>(input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
      if (!headers.has("Accept")) headers.set("Accept", "application/json");

      const clean = sanitizeToken(token);
      if (clean && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${clean}`);
      }

      const r = await fetch(input, {
        ...init,
        headers,
        cache: "no-store",
        credentials: "include",
      });

      const text = await r.text();
      if (!r.ok) throw new Error(text || `HTTP ${r.status}`);
      return (text ? JSON.parse(text) : ({} as any)) as T;
    },
    [token]
  );

  const login = useCallback(async (username: string, password: string) => {
    try {
      const r = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return { ok: false as const, error: data?.error ?? "Credenciales inválidas" };
      }

      const t = sanitizeToken(data?.token as string | undefined);
      if (t) {
        window.localStorage.setItem(TOKEN_KEY, t);
        setToken(t);
        return { ok: true as const };
      }

      if (data?.user) {
        setUser(data.user);
        return { ok: true as const };
      }

      return { ok: true as const };
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? "No se pudo iniciar sesión" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(LOGOUT_URL, { method: "POST", credentials: "include" });
    } catch {}
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {}
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles: AppRole[]) => !!user && roles.includes(user.role),
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, token, login, logout, hasRole, fetchJSON }),
    [user, loading, token, login, logout, hasRole, fetchJSON]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
