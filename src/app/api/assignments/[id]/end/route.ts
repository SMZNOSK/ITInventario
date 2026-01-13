// src/app/api/assignments/[id]/end/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { parseId } from "@/server/utils/events";
import * as svc from "@/server/modules/assignments/service";

type ParamsContext = {
  params: Promise<{ id: string }>;
};

// POST /api/assignments/[id]/end
export const POST = withError(
  async (req: NextRequest, context: ParamsContext) => {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const assignmentId = parseId(id);

    await svc.markReturned(assignmentId);
    return NextResponse.json({ ok: true });
  },
);
