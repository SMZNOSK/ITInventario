// src/app/api/assignments/manual/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { CreateManualAssignmentDTO } from "@/server/dto/assignments";
import { createManual, listManual } from "@/server/modules/assignments/service";

export const dynamic = "force-dynamic";

// GET  /api/assignments/manual
export const GET = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const items = await listManual();
  return NextResponse.json({ items });
});

// POST /api/assignments/manual
export const POST = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const body = await req.json();
  const input = CreateManualAssignmentDTO.parse(body);

  const created = await createManual(input);
  return NextResponse.json(created, { status: 201 });
});
