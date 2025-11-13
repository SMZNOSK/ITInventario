// src/app/api/assets/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import * as s from "@/server/modules/assets/service";
import { CreateAssetDTO } from "@/server/dto/assets";
// Opcional si quieres auth/roles:
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const GET = withError(async () => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const items = await s.list();
  return NextResponse.json({ items });
});

export const POST = withError(async (req) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

  const json = await req.json();
  const data = CreateAssetDTO.parse(json);
  const asset = await s.create(data);
  return NextResponse.json({ asset }, { status: 201 });
});
