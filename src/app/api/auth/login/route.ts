// src/app/api/auth/login/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signToken } from "@/server/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña son obligatorios" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { hotels: { select: { id: true } } },
    });

    if (!user || String(user.status) !== "ALTA") {
      return NextResponse.json(
        { error: "Credenciales inválidas o usuario inactivo" },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Usuario o contraseña inválidos" }, { status: 401 });
    }

    // 👇 Mantengo tu payload (usa 'sub'). Si tu verificación espera 'id', cambia a { id: user.id, ... }.
    const token = signToken({ sub: user.id, role: user.role }, "7d");

    // Respuesta igual que la tuya…
    const res = NextResponse.json({ token }, { status: 200 });

    // …pero además setea cookie httpOnly para consumo server → server
    res.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}
