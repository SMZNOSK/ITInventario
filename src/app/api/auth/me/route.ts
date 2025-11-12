// src/app/api/auth/me/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { withError } from "@/server/utils/withError";
import { cookies, headers } from "next/headers";

function readBearer() {
  const auth = headers().get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export const GET = withError(async () => {
  const c = cookies();
  const raw = c.get("token")?.value ?? readBearer();
  if (!raw) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let payload: { id: number; role: string } | null = null;
  try {
    payload = verifyToken(raw);
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const u = await prisma.user.findUnique({
    where: { id: payload.id },
    include: { hotels: { select: { id: true } } },
  });
  if (!u) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    user: {
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      status: u.status,
      hotels: u.hotels.map((h) => h.hotelId),
    },
  });
});
