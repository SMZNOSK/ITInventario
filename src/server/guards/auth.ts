// src/server/guards/auth.ts
import "server-only";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth"; // <- MISMO verificador que /api/auth/me

/** Roles de la app */
export type AppRole = "ADMIN" | "ALMACEN" | "INGENIERO" | "USER";

export type UserPayload = {
  id: number;
  role: AppRole;
  hotels: number[];
};

type GuardFail = { ok: false; res: NextResponse };
type GuardOk<T> = { ok: true; data: T };

const BAD_LITERALS = new Set(["", "null", "undefined"]);

function sanitizeToken(raw: string | null): string | null {
  if (!raw) return null;
  let t = raw.trim();
  if (!t) return null;

  if (t.toLowerCase().startsWith("bearer ")) t = t.slice(7).trim();
  if (t.startsWith("s:")) t = t.slice(2).trim();

  const low = t.toLowerCase();
  if (BAD_LITERALS.has(low)) return null;

  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
    if (!t) return null;
  }

  return t;
}

function tokenFromAuthHeader(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  return sanitizeToken(h.slice(7));
}

function tokenFromCookie(req: Request): string | null {
  const raw = req.headers.get("cookie") || "";
  if (!raw) return null;

  const parts = raw.split(";").map((s) => s.trim());

  let hit = parts.find((p) => p.toLowerCase().startsWith("token="));
  if (!hit) hit = parts.find((p) => p.toLowerCase().startsWith("session="));
  if (!hit) return null;

  const idx = hit.indexOf("=");
  const v = idx >= 0 ? hit.slice(idx + 1) : "";
  if (!v) return null;

  try {
    return sanitizeToken(decodeURIComponent(v));
  } catch {
    return sanitizeToken(v);
  }
}

export async function requireAuth(
  req: Request
): Promise<GuardOk<UserPayload> | GuardFail> {
  const headerTok = tokenFromAuthHeader(req);
  const cookieTok = tokenFromCookie(req);

  const candidates = Array.from(
    new Set([headerTok, cookieTok].filter(Boolean) as string[])
  );

  if (candidates.length === 0) {
    return {
      ok: false,
      res: NextResponse.json({ error: "No autenticado" }, { status: 401 }),
    };
  }

  // Probar ambos tokens: Bearer y cookie. El primero que verifique gana.
  let lastErr: unknown = null;

  for (const tok of candidates) {
    try {
      const payload = (await verifyToken(tok)) as any; // <- lib/auth
      const userId = Number(payload?.id);

      if (!Number.isFinite(userId)) {
        return {
          ok: false,
          res: NextResponse.json({ error: "Token inválido" }, { status: 401 }),
        };
      }

      const role = String(payload?.role ?? "USER") as AppRole;

      const links = await prisma.userHotel.findMany({
        where: { userId },
        select: { hotelId: true },
      });

      return {
        ok: true,
        data: {
          id: userId,
          role,
          hotels: links.map((l) => l.hotelId),
        },
      };
    } catch (e) {
      lastErr = e;
      continue;
    }
  }

  return {
    ok: false,
    res: NextResponse.json({ error: "Token inválido" }, { status: 401 }),
  };
}

export function ensureRole(user: UserPayload, ...roles: AppRole[]): NextResponse | null {
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }
  return null;
}

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

/**
 * Devuelve los IDs de hoteles a los que el usuario tiene acceso.
 * Para ADMIN devuelve null (indica acceso a todos).
 * Para otros usuarios devuelve el array de hotels.
 */
export function getAllowedHotelIds(user: UserPayload): number[] | null {
  if (user.role === "ADMIN") return null;
  return user.hotels;
}

/**
 * Verifica si el usuario tiene acceso a un hotel específico.
 * ADMIN tiene acceso a todos. Otros deben tenerlo en su lista.
 */
export function hasHotelAccess(user: UserPayload, hotelId: number | null | undefined): boolean {
  if (user.role === "ADMIN") return true;
  if (hotelId == null) return false;
  return user.hotels.includes(hotelId);
}
