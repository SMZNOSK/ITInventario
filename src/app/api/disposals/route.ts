// src/app/api/disposals/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { DisposeDTO } from "@/server/dto/disposals";
import * as s from "@/server/modules/disposals/service";
// Opcional: auth
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const GET = withError(async () => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const items = await s.list();
  return NextResponse.json({ items });
});

export const POST = withError(async (req) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const body = await req.json();
  const data = DisposeDTO.parse(body);
  const disposal = await s.dispose(data);
  return NextResponse.json({ disposal }, { status: 201 });
});
