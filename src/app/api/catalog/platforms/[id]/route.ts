// src/app/api/catalog/platforms/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { parseId } from "@/server/utils/events";
import * as svc from "@/server/modules/platforms/service";
import { requireAuth } from "@/server/guards/auth";

type ParamsContext = {
  // En Next 16 los params vienen como Promise
  params: Promise<{ id: string }>;
};

// PATCH /api/catalog/platforms/[id]
export const PATCH = withError(
  async (req: NextRequest, context: ParamsContext) => {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const { id } = await context.params; // <- esperamos la Promise
    const platformId = parseId(id);

    const body = await req.json();
    const platform = await svc.update(platformId, body);

    return NextResponse.json({ platform });
  },
);

// DELETE /api/catalog/platforms/[id]
export const DELETE = withError(
  async (req: NextRequest, context: ParamsContext) => {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const { id } = await context.params; // <- esperamos la Promise
    const platformId = parseId(id);

    await svc.remove(platformId);

    return NextResponse.json({ ok: true });
  },
);
