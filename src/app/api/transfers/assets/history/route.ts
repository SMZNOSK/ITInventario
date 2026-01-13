// src/app/api/transfers/assets/history/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth, ensureRole } from "@/server/guards/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/transfers/assets/history
 * Obtener el historial de transferencias (completadas y canceladas)
 * Query params:
 *   - status: "COMPLETED" | "CANCELED" | "all" (default: "all")
 *   - createdBy: string (búsqueda por nombre del usuario que envió)
 *   - acceptedBy: string (búsqueda por nombre del usuario que aceptó/canceló)
 *   - limit: number (default: 50, max: 200)
 *   - offset: number (default: 0)
 */
export const GET = withError(async (req: NextRequest) => {
    // 1. Autenticación
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // 2. Solo ADMIN puede ver historial
    const deny = ensureRole(auth.data, "ADMIN");
    if (deny) return deny;

    // 3. Parsear query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "all";
    const createdBySearch = searchParams.get("createdBy")?.trim() ?? "";
    const acceptedBySearch = searchParams.get("acceptedBy")?.trim() ?? "";
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);
    const offset = Number(searchParams.get("offset")) || 0;

    // 4. Construir filtros de status
    const statusFilter = status === "all"
        ? { status: { in: ["COMPLETED", "CANCELED"] as const } }
        : { status: status === "COMPLETED" ? "COMPLETED" : "CANCELED" };

    // 5. Si hay búsqueda por usuario, primero buscar IDs de usuarios
    let createdByUserIds: number[] | undefined;
    let acceptedByUserIds: number[] | undefined;

    if (createdBySearch) {
        const users = await prisma.user.findMany({
            where: { name: { contains: createdBySearch, mode: "insensitive" } },
            select: { id: true },
        });
        createdByUserIds = users.map((u) => u.id);
        if (createdByUserIds.length === 0) {
            // No hay coincidencias, devolver vacío
            return NextResponse.json({
                ok: true,
                items: [],
                total: 0,
                limit,
                offset,
            });
        }
    }

    if (acceptedBySearch) {
        const users = await prisma.user.findMany({
            where: { name: { contains: acceptedBySearch, mode: "insensitive" } },
            select: { id: true },
        });
        acceptedByUserIds = users.map((u) => u.id);
        if (acceptedByUserIds.length === 0) {
            return NextResponse.json({
                ok: true,
                items: [],
                total: 0,
                limit,
                offset,
            });
        }
    }

    // 6. Construir filtro completo
    const whereFilter: any = { ...statusFilter };
    if (createdByUserIds) {
        whereFilter.createdByUserId = { in: createdByUserIds };
    }
    if (acceptedByUserIds) {
        whereFilter.OR = [
            { acceptedByUserId: { in: acceptedByUserIds } },
            { canceledByUserId: { in: acceptedByUserIds } },
        ];
    }

    // 7. Obtener transferencias
    const [transfers, total] = await Promise.all([
        prisma.assetTransfer.findMany({
            where: whereFilter,
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
            orderBy: [
                { updatedAt: "desc" },
                { createdAt: "desc" },
            ],
            take: limit,
            skip: offset,
        }),
        prisma.assetTransfer.count({
            where: whereFilter,
        }),
    ]);

    // 8. Obtener usuarios involucrados
    const userIds = new Set<number>();
    transfers.forEach((t) => {
        if (t.createdByUserId) userIds.add(t.createdByUserId);
        if (t.acceptedByUserId) userIds.add(t.acceptedByUserId);
        if (t.canceledByUserId) userIds.add(t.canceledByUserId);
    });

    const users = await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 9. Mapear resultados
    const items = transfers.map((t) => ({
        id: t.id,
        status: t.status,
        asset: {
            id: t.asset.id,
            serial: t.asset.serial,
            type: t.asset.type.name,
            brand: t.asset.brand.name,
            model: t.asset.model.name,
        },
        originHotel: t.originHotel,
        destHotel: t.destHotel,
        createdAt: t.createdAt,
        createdBy: t.createdByUserId ? userMap.get(t.createdByUserId) ?? null : null,
        acceptedAt: t.acceptedAt,
        acceptedBy: t.acceptedByUserId ? userMap.get(t.acceptedByUserId) ?? null : null,
        canceledAt: t.canceledAt,
        canceledBy: t.canceledByUserId ? userMap.get(t.canceledByUserId) ?? null : null,
    }));

    return NextResponse.json({
        ok: true,
        items,
        total,
        limit,
        offset,
    });
});
