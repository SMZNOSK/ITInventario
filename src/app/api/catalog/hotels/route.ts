// src/app/api/catalog/hotels/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";

export const GET = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  // ✅ No hacemos select con fields que no existan (tu Hotel NO tiene `status`)
  const hotels = await prisma.hotel.findMany({
    orderBy: { name: "asc" },
  });

  const items = hotels.map((h: any) => ({
    id: h.id,
    name: h.name,
    // en tu schema sí existe isActive (por eso no tronaba), lo exponemos
    isActive: Boolean(h.isActive),
  }));

  return NextResponse.json({ items });
});
