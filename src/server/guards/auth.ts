// src/server/guards/auth.ts
import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/server/auth";

/** Roles de la app (ajusta si tu enum crece) */
export type AppRole = "ADMIN" | "ALMACEN" | "INGENIERO";

/** Payload que expondremos a las rutas */
export type UserPayload = {
  id: number;
  role: AppRole;
  hotels: number[]; // permisos por hotel
};

/** Resultado estándar para guards */
type GuardFail = { ok: false; res: NextResponse };
type GuardOk<T> = { ok: true; data: T };

/* --------------- helpers internos --------------- */

/** Intenta extraer Bearer de Authorization */
function tokenFromAuthHeader(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  if (h.startsWith("Bearer ")) return h.slice(7).trim() || null;
  return null;
}

/** Busca cookie 'token' en header Cookie */
function tokenFromCookie(req: Request): string | null {
  const raw = req.headers.get("cookie") || "";
  if (!raw) return null;
  const parts = raw.split(";").map((s) => s.trim());
  const hit = parts.find((p) => p.toLowerCase().startsWith("token="));
  if (!hit) return null;
  const [, v] = hit.split("=");
  return v ? decodeURIComponent(v) : null;
}

/** Extrae token por cookie o auth header */
function extractToken(req: Request): string | null {
  return tokenFromCookie(req) ?? tokenFromAuthHeader(req);
}

/* --------------- Guards públicos --------------- */

/**
 * requireAuth:
 * - Verifica JWT
 * - Carga hoteles del usuario
 * Devuelve {ok:true,data:user} o {ok:false,res:NextResponse} con 401.
 */
export async function requireAuth(
  req: Request
): Promise<GuardOk<UserPayload> | GuardFail> {
  try {
    const raw = extractToken(req);
    if (!raw) {
      return { ok: false, res: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
    }

    // payload esperado: { id:number, role: AppRole }
    const payload = verifyToken<{ id: number; role: AppRole }>(raw);

    const links = await prisma.userHotel.findMany({
      where: { userId: payload.id },
      select: { id: true },
    });

    return {
      ok: true,
      data: {
        id: payload.id,
        role: payload.role,
        hotels: links.map((l) => l.hotelId),
      },
    };
  } catch {
    return { ok: false, res: NextResponse.json({ error: "Token inválido" }, { status: 401 }) };
  }
}

/**
 * ensureRole:
 * - Verifica que user.role esté dentro de roles permitidos.
 * Devuelve `null` si pasa; NextResponse 403 si falla.
 */
export function ensureRole(user: UserPayload, ...roles: AppRole[]): NextResponse | null {
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  return null;
}

/**
 * ensureHotelAccess:
 * - ADMIN pasa siempre
 * - Para otros roles, exige que hotelId ∈ user.hotels
 * Devuelve `null` si pasa; NextResponse 400/403 si falla.
 */
export function ensureHotelAccess(
  user: UserPayload,
  hotelIdRaw: unknown,
  paramName = "hotelId"
): NextResponse | null {
  const hotelId = Number(hotelIdRaw);
  if (!Number.isFinite(hotelId)) {
    return NextResponse.json({ error: `${paramName} requerido` }, { status: 400 });
  }
  if (user.role === "ADMIN") return null;
  if (!user.hotels.includes(hotelId)) {
    return NextResponse.json({ error: "No tienes acceso a ese hotel" }, { status: 403 });
  }
  return null;
}
