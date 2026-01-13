// src/app/api/transfers/assets/bulk-confirm/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth, ensureRole } from "@/server/guards/auth";
import { confirmBulk } from "@/server/modules/transfers/service";

/**
 * POST /api/transfers/assets/bulk-confirm
 * Confirmar múltiples transferencias a la vez
 * Body: { transferIds: number[] }
 */
export const POST = withError(async (req: NextRequest) => {
    // 1. Autenticación
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // 2. Solo ADMIN, INGENIERO y ALMACEN pueden confirmar
    const deny = ensureRole(auth.data, "ADMIN", "INGENIERO", "ALMACEN");
    if (deny) return deny;

    // 3. Parsear body
    const body = await req.json().catch(() => null);
    const transferIds = body?.transferIds;

    if (!Array.isArray(transferIds) || transferIds.length === 0) {
        return NextResponse.json({ error: "Debes proporcionar al menos un ID de transferencia" }, { status: 400 });
    }

    if (transferIds.length > 100) {
        return NextResponse.json({ error: "Máximo 100 transferencias por operación" }, { status: 400 });
    }

    // Validar que todos sean números válidos
    const validIds = transferIds.map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0);
    if (validIds.length === 0) {
        return NextResponse.json({ error: "IDs de transferencia inválidos" }, { status: 400 });
    }

    // 4. Confirmar transferencias en bulk
    const results = await confirmBulk({
        transferIds: validIds,
        acceptedByUserId: auth.data.id,
        userHotelIds: auth.data.hotels,
        isAdmin: auth.data.role === "ADMIN",
    });

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
        ok: true,
        results,
        successCount,
        errorCount,
        totalProcessed: results.length,
    });
});
