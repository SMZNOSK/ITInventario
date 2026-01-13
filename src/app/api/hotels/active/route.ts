// src/app/api/hotels/active/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/hotels/active
 * Listar todos los hoteles activos (para selectores)
 * Cualquier usuario autenticado puede verlos
 */
export const GET = withError(async (req: NextRequest) => {
    // Solo requiere autenticación, cualquier rol puede ver hoteles activos
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const hotels = await prisma.hotel.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
        },
        orderBy: { name: "asc" },
    });

    return NextResponse.json({
        ok: true,
        items: hotels.map((h) => ({ ...h, active: true })),
    });
});
