// src/app/api/admin/users/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { usersService } from "@/server/modules/users/service";
import { UpdateUserDTO } from "@/server/dto/users";
import { requireAuth, ensureRole } from "@/server/guards/auth";
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = Number(process.env.AUTH_BCRYPT_ROUNDS ?? 10);

type RouteParams = { params: Promise<{ id: string }> };

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("ID inválido");
  return id;
}

// ✅ GET: Obtener usuario (solo ADMIN)
export const GET = withError(async (req: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  const user = await usersService.getById(id);
  if (!user) throw http.notFound("Usuario no encontrado");
  return NextResponse.json(user);
});

// ✅ PUT: Actualizar usuario (solo ADMIN)
export const PUT = withError(async (req: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  const body = await req.json();
  const data = UpdateUserDTO.parse(body);

  const update: any = {
    name: data.name,
    role: data.role,
    status: data.status,
    hotelIds: data.hotelIds,
  };

  if (data.password) {
    update.passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  }

  try {
    const user = await usersService.update(id, update);
    return NextResponse.json(user);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese username" },
        { status: 409 }
      );
    }
    throw err;
  }
});

// ✅ DELETE: Eliminar usuario (solo ADMIN)
export const DELETE = withError(async (req: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  try {
    await usersService.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    throw err;
  }
});
