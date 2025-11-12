// src/app/api/collaborators/[emplid]/alta-ps/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { altaColaboradorEnPS } from "@/server/modules/collaborators/orchestrator";

export const POST = withError(async (_req, { params }: { params: { emplid: string } }) => {
  const out = await altaColaboradorEnPS(params.emplid);
  return NextResponse.json(out);
});
