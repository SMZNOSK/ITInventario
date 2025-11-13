// src/app/api/catalog/types/activos/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { listTiposActivos } from "@/server/modules/types/service";

export const GET = withError(async () => {
  const tipos = await listTiposActivos();
  return NextResponse.json({ success: true, tipos });
});