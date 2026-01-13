// src/app/api/disposals/[id]/route.ts
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
 * GET /api/disposals/:id
 * Devuelve el detalle de una baja con asset.
 */
export const GET = withError(async (_req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const disposalId = parseId(id);

    // Simple query without new relations that may not be synced
    const disposal = await prisma.disposal.findUnique({
        where: { id: disposalId },
        include: {
            asset: {
                include: {
                    type: true,
                    brand: true,
                    model: true,
                    currentHotel: true,
                },
            },
            createdBy: {
                select: { id: true, name: true, username: true },
            },
        },
    });

    if (!disposal) {
        throw http.notFound("Baja no encontrada");
    }

    // Get hotel name from asset if available
    const hotelName = disposal.asset.currentHotel?.name ?? null;

    return NextResponse.json({
        disposal: {
            id: disposal.id,
            assetId: disposal.assetId,
            hotelId: null, // Will be populated when schema is synced
            reason: disposal.reason,
            notes: disposal.notes,
            evidenceUrl: disposal.evidenceUrl,
            disposedAt: disposal.disposedAt,
            createdAt: disposal.disposedAt, // fallback
            restoredAt: null,
            asset: {
                id: disposal.asset.id,
                serial: disposal.asset.serial,
                status: disposal.asset.status,
                typeName: disposal.asset.type?.name ?? null,
                brandName: disposal.asset.brand?.name ?? null,
                modelName: disposal.asset.model?.name ?? null,
                hotelName,
            },
            hotel: hotelName ? { id: disposal.asset.currentHotelId, name: hotelName } : null,
            createdBy: disposal.createdBy,
            restoredBy: null,
            evidences: [],
        },
    });
});

/**
 * PATCH /api/disposals/:id
 * Edita motivo y notas de una baja.
 */
export const PATCH = withError(async (req: NextRequest, context: RouteContext) => {
    const { id } = await context.params;
    const disposalId = parseId(id);

    const body = await req.json();
    const { reason, notes } = body as {
        reason?: string;
        notes?: string;
    };

    const existing = await prisma.disposal.findUnique({
        where: { id: disposalId },
    });

    if (!existing) {
        throw http.notFound("Baja no encontrada");
    }

    const updated = await prisma.disposal.update({
        where: { id: disposalId },
        data: {
            ...(reason !== undefined && { reason }),
            ...(notes !== undefined && { notes }),
        },
    });

    return NextResponse.json({ disposal: updated });
});
