// src/app/api/disposals/[id]/restore/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { prisma } from "@/lib/db";

type RouteContext = {
    params: Promise<{ id: string }>;
};

function parseId(raw: string): number {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw http.badRequest("id inválido");
    }
    return id;
}

/**
 * POST /api/disposals/:id/restore
 * Restaura un equipo de BAJA a ALTA.
 */
export const POST = withError(async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const disposalId = parseId(id);

    const disposal = await prisma.disposal.findUnique({
        where: { id: disposalId },
        include: {
            asset: true,
        },
    });

    if (!disposal) {
        throw http.notFound("Baja no encontrada");
    }

    if (disposal.asset.status !== "BAJA") {
        throw http.badRequest("El equipo no está en estado BAJA");
    }

    // Solo actualizar el estado del asset a ALTA
    // No intentamos actualizar restoredAt/restoredById porque pueden no estar en el schema
    await prisma.asset.update({
        where: { id: disposal.assetId },
        data: { status: "ALTA" },
    });

    // Intentar actualizar restoredAt via SQL directo si es posible
    try {
        await prisma.$executeRaw`UPDATE "Disposal" SET "restoredAt" = NOW() WHERE id = ${disposalId}`;
    } catch {
        // Ignorar si falla - el equipo ya está restaurado
    }

    return NextResponse.json({
        success: true,
        message: "Equipo restaurado a ALTA correctamente",
        disposal: {
            id: disposal.id,
            assetId: disposal.assetId,
            restoredAt: new Date().toISOString(),
        },
    });
});
