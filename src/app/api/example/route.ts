// src/app/api/example/route.ts
export const runtime = "nodejs"; // si usas prisma/bcrypt/jwt
import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { prisma } from "@/lib/db";

export const GET = withError(async (_req) => {
  const items = await prisma.hotel.findMany(); // ejemplo
  return NextResponse.json({ items });
});

export const POST = withError(async (req) => {
  const body = await req.json();
  if (!body?.name) throw http.badRequest("name es requerido");
  // ...
  return NextResponse.json({ ok: true }, { status: 201 });
});
