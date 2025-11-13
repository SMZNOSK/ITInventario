// src/app/api/collaborators/[id]/assets-external/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { importExternalAssetsForEmployee } from "@/server/modules/collaborators/orchestrator";

export const GET = withError(async (_req, { params }: { params: { id: string } }) => {
  const out = await importExternalAssetsForEmployee(params.id);
  return NextResponse.json(out);
});
