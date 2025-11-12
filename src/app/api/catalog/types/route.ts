// src/app/api/catalog/types/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { listTipos, createTipo } from "@/server/modules/types/service";
import { CreateTypeDTO } from "@/server/dto/types";
// Opcional auth:
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const GET = withError(async () => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

  const tipos = await listTipos();
  return NextResponse.json({ success: true, tipos });
});

export const POST = withError(async (req) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

  const body = await req.json();
  const { nombre } = CreateTypeDTO.parse(body);
  const id = await createTipo(nombre);
  return NextResponse.json({ success: true, id }, { status: 201 });
});
