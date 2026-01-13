// src/app/api/transfers/assets/pending/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth, ensureRole } from "@/server/guards/auth";
import { transfersService } from "@/server/modules/transfers/service";

/**
 * GET /api/transfers/assets/pending
 * Listar transferencias pendientes
 * Query: ?scope=destination (para aceptar) | ?scope=origin (las que inicié)
 */
export const GET = withError(async (req: NextRequest) => {
    // 1. Autenticación
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // 2. Solo ADMIN, INGENIERO y ALMACEN pueden ver transferencias
    const deny = ensureRole(auth.data, "ADMIN", "INGENIERO", "ALMACEN");
    if (deny) return deny;

    // 3. Obtener scope
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") === "origin" ? "origin" : "destination";

    // 4. Determinar hoteles a filtrar
    // ADMIN ve todo si no tiene hoteles específicos
    const hotelIds =
        auth.data.role === "ADMIN" && auth.data.hotels.length === 0
            ? [] // ADMIN sin hoteles asignados → ver todos
            : auth.data.hotels;

    // Si ADMIN sin hoteles, obtenemos todos los pendientes
    let transfers;
    if (auth.data.role === "ADMIN" && hotelIds.length === 0) {
        // ADMIN ve todas las pendientes
        const { prisma } = await import("@/lib/db");
        transfers = await prisma.assetTransfer.findMany({
            where: { status: "PENDING" },
            include: {
                asset: {
                    select: {
                        id: true,
                        serial: true,
                        type: { select: { name: true } },
                        brand: { select: { name: true } },
                        model: { select: { name: true } },
                    },
                },
                originHotel: { select: { id: true, name: true } },
                destHotel: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    } else if (hotelIds.length === 0) {
        // Usuario sin hoteles asignados → no ve nada
        transfers = [];
    } else {
        transfers = await transfersService.listPending(scope, hotelIds);
    }

    return NextResponse.json({
        ok: true,
        scope,
        items: transfers.map((t) => ({
            id: t.id,
            assetId: t.assetId,
            asset: {
                serial: t.asset.serial,
                type: t.asset.type.name,
                brand: t.asset.brand.name,
                model: t.asset.model.name,
            },
            originHotel: t.originHotel,
            destHotel: t.destHotel,
            status: t.status,
            createdAt: t.createdAt,
        })),
    });
});
