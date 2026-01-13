// src/app/api/assignments/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { parseId } from "@/server/utils/events";
import * as svc from "@/server/modules/assignments/service";
import { UpdateAssignmentDTO } from "@/server/dto/assignments";

type ParamsContext = {
  params: Promise<{ id: string }>;
};

// PATCH /api/assignments/[id]
export const PATCH = withError(
  async (req: NextRequest, context: ParamsContext) => {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const assignmentId = parseId(id);

    const body = await req.json();
    const dto = UpdateAssignmentDTO.parse(body);

    const assignment = await svc.update(assignmentId, dto);
    return NextResponse.json({ assignment });
  },
);

// DELETE /api/assignments/[id]
export const DELETE = withError(
  async (req: NextRequest, context: ParamsContext) => {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const assignmentId = parseId(id);

    await svc.remove(assignmentId);
    return NextResponse.json({ ok: true });
  },
);
