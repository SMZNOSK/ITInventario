// src/app/api/disposals/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { requireAuth, hasHotelAccess } from "@/server/guards/auth";
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
 * GET /api/disposals/:id
 * Devuelve el detalle de una baja con asset y evidencias.
 * Valida acceso al hotel del asset.
 */
export const GET = withError(async (req: NextRequest, context: RouteContext) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const { id } = await context.params;
    const disposalId = parseId(id);

    const disposal = await s.getById(disposalId);

    if (!disposal) {
        throw http.notFound("Baja no encontrada");
    }

    // Validar acceso al hotel
    const hotelId = disposal.hotelId ?? disposal.asset.currentHotelId;
    if (!hasHotelAccess(auth.data, hotelId)) {
        throw http.forbidden("No tienes acceso a esta baja");
    }

    return NextResponse.json({
        disposal: {
            id: disposal.id,
            assetId: disposal.assetId,
            hotelId: disposal.hotelId,
            reason: disposal.reason,
            notes: disposal.notes,
            evidenceUrl: disposal.evidenceUrl,
            disposedAt: disposal.disposedAt,
            createdAt: disposal.createdAt,
            restoredAt: disposal.restoredAt,
            asset: {
                id: disposal.asset.id,
                serial: disposal.asset.serial,
                status: disposal.asset.status,
                typeName: disposal.asset.type?.name ?? null,
                brandName: disposal.asset.brand?.name ?? null,
                modelName: disposal.asset.model?.name ?? null,
                hotelName: disposal.asset.currentHotel?.name ?? null,
            },
            hotel: disposal.hotel ? { id: disposal.hotel.id, name: disposal.hotel.name } : null,
            createdBy: disposal.createdBy,
            restoredBy: disposal.restoredBy,
            evidences: disposal.evidences.map((e) => ({
                id: e.id,
                url: e.url,
                filename: e.filename,
            })),
        },
    });
});

/**
 * PATCH /api/disposals/:id
 * Edita motivo, notas y evidencias de una baja.
 * Valida acceso al hotel.
 */
export const PATCH = withError(async (req: NextRequest, context: RouteContext) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const { id } = await context.params;
    const disposalId = parseId(id);

    const body = await req.json();
    const { reason, notes, evidenceIdsToDelete, newEvidenceUrls } = body as {
        reason?: string;
        notes?: string;
        evidenceIdsToDelete?: number[];
        newEvidenceUrls?: string[];
    };

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

    // Eliminar evidencias marcadas
    if (evidenceIdsToDelete && evidenceIdsToDelete.length > 0) {
        await prisma.disposalEvidence.deleteMany({
            where: {
                id: { in: evidenceIdsToDelete },
                disposalId: disposalId,
            },
        });
    }

    // Agregar nuevas evidencias
    if (newEvidenceUrls && newEvidenceUrls.length > 0) {
        await prisma.disposalEvidence.createMany({
            data: newEvidenceUrls.map((url) => ({
                disposalId: disposalId,
                url: url,
                filename: url.split("/").pop() || "evidence",
            })),
        });
    }

    // Actualizar motivo y notas
    const updated = await s.update(disposalId, {
        reason,
        notes,
    });

    return NextResponse.json({ disposal: updated });
});
