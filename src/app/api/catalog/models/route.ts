// src/app/api/catalog/models/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as svc from "@/server/modules/models/service";
import { CreateModelDTO } from "@/server/dto/models";
// Opcional auth:
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const GET = withError(async () => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

  const modelos = await svc.listModelos();
  return NextResponse.json({ success: true, modelos });
});

export const POST = withError(async (req) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

  const body = await req.json();
  const data = CreateModelDTO.parse(body);
  const id = await svc.createModelo(data);
  return NextResponse.json({ success: true, id }, { status: 201 });
});
