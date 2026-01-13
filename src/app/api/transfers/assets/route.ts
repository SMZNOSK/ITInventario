// src/app/api/transfers/assets/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth, ensureRole, ensureHotelAccess } from "@/server/guards/auth";
import { transfersService } from "@/server/modules/transfers/service";
import { prisma } from "@/lib/db";

/**
 * POST /api/transfers/assets
 * Crear una nueva transferencia de equipo
 * Body: { assetId: number, destHotelId: number }
 */
export const POST = withError(async (req: NextRequest) => {
    // 1. Autenticación
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // 2. Solo ADMIN, INGENIERO y ALMACEN pueden iniciar transferencias
    const deny = ensureRole(auth.data, "ADMIN", "INGENIERO", "ALMACEN");
    if (deny) return deny;

    // 3. Parsear body
    const body = await req.json().catch(() => null);
    const assetId = Number(body?.assetId);
    const destHotelId = Number(body?.destHotelId);

    if (!Number.isFinite(assetId) || assetId <= 0) {
        return NextResponse.json({ error: "assetId inválido" }, { status: 400 });
    }

    if (!Number.isFinite(destHotelId) || destHotelId <= 0) {
        return NextResponse.json({ error: "destHotelId inválido" }, { status: 400 });
    }

    // 4. Verificar que el usuario tiene acceso al hotel origen del asset
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { currentHotelId: true },
    });

    if (!asset) {
        return NextResponse.json({ error: "Equipo no encontrado" }, { status: 404 });
    }

    if (!asset.currentHotelId) {
        return NextResponse.json({ error: "El equipo no tiene hotel asignado" }, { status: 400 });
    }

    // 5. Verificar acceso al hotel origen (excepto ADMIN)
    if (auth.data.role !== "ADMIN") {
        const hotelDeny = ensureHotelAccess(auth.data, asset.currentHotelId, "hotel origen");
        if (hotelDeny) return hotelDeny;
    }

    // 6. Crear transferencia
    try {
        const transfer = await transfersService.create({
            assetId,
            destHotelId,
            createdByUserId: auth.data.id,
        });

        return NextResponse.json({
            ok: true,
            transfer: {
                id: transfer.id,
                assetId: transfer.assetId,
                originHotelId: transfer.originHotelId,
                destHotelId: transfer.destHotelId,
                status: transfer.status,
                createdAt: transfer.createdAt,
            },
        });
    } catch (err: any) {
        if (err?.code === "NOT_FOUND") {
            return NextResponse.json({ error: err.message }, { status: 404 });
        }
        if (err?.code === "CONFLICT") {
            return NextResponse.json({ error: err.message }, { status: 409 });
        }
        if (err?.code === "BAD_REQUEST") {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
    }
});
