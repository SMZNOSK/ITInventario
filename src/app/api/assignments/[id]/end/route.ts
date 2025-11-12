// src/app/api/assignments/[id]/end/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as s from "@/server/modules/assignments/service";
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const PATCH = withError(async (_req, { params }: { params: { id: string } }) => {
  // const auth = await requireAuth(_req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const out = await s.end(params.id);
  return NextResponse.json({ assignment: out });
});
