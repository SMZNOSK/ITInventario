// src/app/api/disposals/[id]/delete/route.ts
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
 * DELETE /api/disposals/:id/delete
 * Elimina un registro de baja del historial.
 */
export const DELETE = withError(async (_req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const disposalId = parseId(id);

    const disposal = await prisma.disposal.findUnique({
        where: { id: disposalId },
    });

    if (!disposal) {
        throw http.notFound("Baja no encontrada");
    }

    // Eliminar evidencias primero (si existen)
    try {
        await prisma.disposalEvidence.deleteMany({
            where: { disposalId },
        });
    } catch {
        // Ignorar si falla
    }

    // Eliminar el registro de baja
    await prisma.disposal.delete({
        where: { id: disposalId },
    });

    return NextResponse.json({
        success: true,
        message: "Registro de baja eliminado del historial",
    });
});
