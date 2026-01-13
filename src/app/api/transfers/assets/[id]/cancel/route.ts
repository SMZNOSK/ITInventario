// src/app/api/transfers/assets/[id]/cancel/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { requireAuth, ensureRole, ensureHotelAccess } from "@/server/guards/auth";
import { transfersService } from "@/server/modules/transfers/service";

type RouteParams = { params: Promise<{ id: string }> };

function parseId(raw: string) {
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) throw http.badRequest("ID inválido");
    return id;
}

/**
 * POST /api/transfers/assets/:id/cancel
 * Cancelar una transferencia (solo usuarios con acceso al hotel origen)
 */
export const POST = withError(async (req: NextRequest, { params }: RouteParams) => {
    // 1. Autenticación
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // 2. Solo ADMIN, INGENIERO y ALMACEN pueden cancelar
    const deny = ensureRole(auth.data, "ADMIN", "INGENIERO", "ALMACEN");
    if (deny) return deny;

    // 3. Obtener ID
    const { id: rawId } = await params;
    const transferId = parseId(rawId);

    // 4. Verificar que la transferencia existe
    const transfer = await transfersService.getById(transferId);
    if (!transfer) {
        return NextResponse.json({ error: "Transferencia no encontrada" }, { status: 404 });
    }

    // 5. Verificar acceso al hotel origen (solo el origen puede cancelar)
    if (auth.data.role !== "ADMIN") {
        const hotelDeny = ensureHotelAccess(auth.data, transfer.originHotelId, "hotel origen");
        if (hotelDeny) return hotelDeny;
    }

    // 6. Cancelar transferencia
    try {
        const canceled = await transfersService.cancel(transferId, auth.data.id);

        return NextResponse.json({
            ok: true,
            message: "Transferencia cancelada exitosamente",
            transfer: {
                id: canceled.id,
                status: canceled.status,
                canceledAt: canceled.canceledAt,
            },
        });
    } catch (err: any) {
        if (err?.code === "NOT_FOUND") {
            return NextResponse.json({ error: err.message }, { status: 404 });
        }
        if (err?.code === "CONFLICT") {
            return NextResponse.json({ error: err.message }, { status: 409 });
        }
        throw err;
    }
});
