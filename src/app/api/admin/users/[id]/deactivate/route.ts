// src/app/api/admin/users/[id]/deactivate/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { usersService } from "@/server/modules/users/service";
import { UserStatus } from "@prisma/client";

// Opcional auth:
// import { requireAuth, ensureRole } from "@/server/guards/auth}

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("ID inválido");
  return id;
}

export const PATCH = withError(async (_req, { params }: { params: { id: string } }) => {
  // const auth = await requireAuth(_req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

  const id = parseId(params.id);
  try {
    const user = await usersService.setStatus(id, UserStatus.INACTIVO);
    return NextResponse.json(user);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    throw err;
  }
});
