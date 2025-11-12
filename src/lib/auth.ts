// src/lib/auth.ts
import { api } from "./api";

export type AppRole = "ADMIN" | "ALMACEN" | "INGENIERO";

export interface MePayload {
  ok: boolean;
  user: { id: number; username: string; name: string; role: AppRole; status: "ALTA" | "INACTIVO"; hotels: number[] };
}

/** Login: tu API puede devolver { token } o { user }. Devuelve tal cual lo que venga. */
export function login(username: string, password: string) {
  return api<any>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

/** Información de sesión actual */
export function me() {
  return api<MePayload>("/api/auth/me");
}

/** Logout (borra cookie httpOnly si aplica) */
export function logout() {
  return api<{ ok: true }>("/api/auth/logout", { method: "POST" });
}
