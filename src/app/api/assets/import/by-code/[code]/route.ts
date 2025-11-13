// src/app/api/assets/import/by-code/[code]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { importAssetByCode } from "@/server/modules/assets/orchestrator";
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const POST = withError(async (_req, { params }: { params: { code: string } }) => {
  // const auth = await requireAuth(_req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const out = await importAssetByCode(params.code);
  const status = out.ok ? 200 : 502;
  return NextResponse.json(out, { status });
});
