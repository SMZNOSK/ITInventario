// src/app/api/disposals/[id]/restore/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { requireAuth, ensureRole, hasHotelAccess } from "@/server/guards/auth";
import * as s from "@/server/modules/disposals/service";

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
 * Restaura un equipo de BAJA a ALTA (Confirmar ALTA).
 * - Marca la baja con restoredAt y restoredById
 * - Cambia el asset de BAJA a ALTA
 * - Valida acceso al hotel
 */
export const POST = withError(async (req: NextRequest, context: RouteContext) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // Permitir ADMIN, ALMACEN, INGENIERO restaurar
    const deny = ensureRole(auth.data, "ADMIN", "ALMACEN", "INGENIERO");
    if (deny) return deny;

    const { id } = await context.params;
    const disposalId = parseId(id);

    // Obtener la baja para verificar acceso
    const existing = await prisma.disposal.findUnique({
        where: { id: disposalId },
        include: { asset: true },
    });

    if (!existing) {
        throw http.notFound("Baja no encontrada");
    }

    // Validar acceso al hotel
    const hotelId = existing.hotelId ?? existing.asset.currentHotelId;
    if (!hasHotelAccess(auth.data, hotelId)) {
        throw http.forbidden("No tienes acceso a esta baja");
    }

    // Ejecutar la restauración
    const result = await s.restore(disposalId, auth.data.id);

    return NextResponse.json({
        ok: true,
        message: "Equipo restaurado a ALTA correctamente",
        disposal: {
            id: result.disposal.id,
            restoredAt: result.disposal.restoredAt,
        },
        asset: {
            id: result.asset.id,
            serial: result.disposal.asset.serial,
            status: result.asset.status,
        },
    });
});
