// src/app/api/admin/users/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { usersService } from "@/server/modules/users/service";
import { CreateUserDTO } from "@/server/dto/users";
import { requireAuth, ensureRole } from "@/server/guards/auth";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = Number(process.env.AUTH_BCRYPT_ROUNDS ?? 10);

// ✅ GET: Listar usuarios (solo ADMIN)
export const GET = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

  const items = await usersService.listAll();
  return NextResponse.json({ items });
});

// ✅ POST: Crear usuario (solo ADMIN)
export const POST = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

  const body = await req.json();
  const parsed = CreateUserDTO.parse(body);

  const passwordHash = await bcrypt.hash(parsed.password, BCRYPT_ROUNDS);
  try {
    const user = await usersService.create({
      username: parsed.username,
      name: parsed.name,
      role: parsed.role as any,
      passwordHash,
      hotelIds: parsed.hotelIds,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese username" },
        { status: 409 }
      );
    }
    throw err;
  }
});
