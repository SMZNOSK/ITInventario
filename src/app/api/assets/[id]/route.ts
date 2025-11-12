// src/app/api/assets/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import * as s from "@/server/modules/assets/service";
import { UpdateAssetDTO } from "@/server/dto/assets";
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const GET = withError(async (_req, { params }: { params: { id: string } }) => {
  const asset = await s.get(params.id);
  if (!asset) throw http.notFound("Not found");
  return NextResponse.json({ asset });
});

export const PATCH = withError(async (req, { params }: { params: { id: string } }) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

  const body = await req.json();
  const data = UpdateAssetDTO.parse(body);
  const asset = await s.update(params.id, data);
  return NextResponse.json({ asset });
});
