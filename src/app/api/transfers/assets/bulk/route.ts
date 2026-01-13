// src/app/api/transfers/assets/bulk/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth, ensureRole } from "@/server/guards/auth";
import { transfersService } from "@/server/modules/transfers/service";

/**
 * POST /api/transfers/assets/bulk
 * Crear múltiples transferencias de equipos a partir de una lista de seriales
 * Body: { serials: string[], destHotelId: number }
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
    const serials = body?.serials;
    const destHotelId = Number(body?.destHotelId);

    if (!Array.isArray(serials) || serials.length === 0) {
        return NextResponse.json({ error: "Debes proporcionar al menos un serial" }, { status: 400 });
    }

    if (serials.length > 100) {
        return NextResponse.json({ error: "Máximo 100 seriales por operación" }, { status: 400 });
    }

    if (!Number.isFinite(destHotelId) || destHotelId <= 0) {
        return NextResponse.json({ error: "destHotelId inválido" }, { status: 400 });
    }

    // 4. Procesar transferencias en bulk
    const results = await transfersService.createBulk({
        serials: serials.map(s => String(s)),
        destHotelId,
        createdByUserId: auth.data.id,
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
