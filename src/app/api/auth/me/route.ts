// src/app/api/auth/me/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { withError } from "@/server/utils/withError";
import { cookies, headers } from "next/headers";

async function readBearer() {
  const h = await headers();
  const auth = h.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export const GET = withError(async () => {
  const c = await cookies();
  const raw = c.get("token")?.value ?? (await readBearer());
  if (!raw) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let payload: { id: number; role: string } | null = null;
  try {
    payload = await verifyToken(raw);
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const u = await prisma.user.findUnique({
    where: { id: payload.id },
  });
  if (!u) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    user: {
      id: u.id,
      username: (u as any).username ?? null,
      name: (u as any).name ?? null,
      role: (u as any).role ?? "USER",
      status: (u as any).status ?? null,
    },
  });
});
