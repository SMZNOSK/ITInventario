// src/app/api/auth/login/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import { cookies } from "next/headers";
import { compare } from "bcryptjs";
import { signToken } from "@/lib/auth";

type Creds = { identifier: string; password: string };

async function readCreds(req: Request): Promise<Creds> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const b = await req.json().catch(() => ({} as any));
    return {
      identifier: String(b.identifier ?? b.username ?? ""),
      password: String(b.password ?? ""),
    };
  }
  const fd = await req.formData();
  return {
    identifier: String(fd.get("identifier") ?? fd.get("username") ?? ""),
    password: String(fd.get("password") ?? ""),
  };
}

export const POST = withError(async (req: Request) => {
  const { identifier, password } = await readCreds(req);
  if (!identifier || !password) {
    return NextResponse.json({ error: "Faltan credenciales" }, { status: 400 });
  }

  // 👉 Tu modelo User NO tiene email; autenticamos por username (único)
  const user = await prisma.user.findUnique({
    where: { username: identifier },
  });

  if (!user) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 400 });
  }

  // Compatibilidad: passwordHash o password
  const hash =
    (user as any).passwordHash ?? (user as any).password ?? null;
  if (!hash) {
    return NextResponse.json({ error: "Usuario sin contraseña" }, { status: 400 });
  }

  const ok = await compare(password, String(hash));
  if (!ok) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 400 });
  }

  const token = await signToken({
    id: user.id,
    role: (user as any).role ?? "USER",
    username: (user as any).username ?? null,
  });

  const c = await cookies();
  c.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: (user as any).username ?? null,
      name: (user as any).name ?? null,
      role: (user as any).role ?? "USER",
      status: (user as any).status ?? null,
    },
  });
});
