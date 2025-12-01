// src/app/api/catalog/processors/activos/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as svc from "@/server/modules/processors/service";

/**
 * GET /api/catalog/processors/activos
 */
export const GET = withError(async () => {
  const items = await svc.listProcessorsActivos();
  return NextResponse.json({ items });
});
