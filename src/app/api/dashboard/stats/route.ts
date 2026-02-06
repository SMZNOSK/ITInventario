// src/app/api/dashboard/stats/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/dashboard/stats
 * Obtiene estadísticas del dashboard para administradores
 */
export const GET = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // Ejecutar todas las queries en paralelo para mejor performance
    const [
        totalAssets,
        assignedAssets,
        availableAssets,
        loanedAssets,
        disposedAssets,
        pendingTransfersCount,
        activeTransfersCount,
        totalCollaborators,
        activeHotels,
        expiredLoans,
        soonToExpireLoans,
        recentTransfers,
        recentAssignments,
        recentLoans,
    ] = await Promise.all([
        // Total de activos
        prisma.asset.count(),

        // Activos asignados
        prisma.asset.count({
            where: { status: "ASIGNADO" },
        }),

        // Activos disponibles
        prisma.asset.count({
            where: { status: "ALTA" },
        }),

        // Activos en préstamo (contar loans activos)
        prisma.loan.count({
            where: {
                returnDate: null,
                endDate: { gte: new Date() },
            },
        }),

        // Activos dados de baja
        prisma.disposal.count(),

        // Transferencias pendientes de aceptar
        prisma.assetTransfer.count({
            where: { status: "PENDING" },
        }),

        // Transferencias completadas recientemente (últimos 30 días)
        prisma.assetTransfer.count({
            where: {
                status: "COMPLETED",
                updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            },
        }),

        // Total de colaboradores únicos
        prisma.collaborator.count(),

        // Hoteles activos
        prisma.hotel.count({
            where: { isActive: true },
        }),

        // Préstamos vencidos
        prisma.loan.count({
            where: {
                returnDate: null,
                endDate: { lt: new Date() },
            },
        }),

        // Préstamos por vencer (próximos 7 días)
        prisma.loan.count({
            where: {
                returnDate: null,
                endDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            },
        }),

        // Últimas 5 transferencias (sin relación createdBy porque no existe)
        prisma.assetTransfer.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
                originHotel: { select: { name: true } },
                destHotel: { select: { name: true } },
            },
        }),

        // Últimas 5 asignaciones
        prisma.assignment.findMany({
            take: 5,
            orderBy: { assignedAt: "desc" },
            include: {
                collaborator: { select: { name: true } },
                asset: {
                    select: {
                        serial: true,
                        type: { select: { name: true } },
                    },
                },
            },
        }),

        // Últimos 5 préstamos
        prisma.loan.findMany({
            take: 5,
            orderBy: { startDate: "desc" },
            select: {
                id: true,
                collaboratorName: true,
                collaboratorId: true,
                teamName: true,
                startDate: true,
                returnDate: true,
            },
        }),
    ]);

    // Formatear actividad reciente
    const recentActivity = [
        ...recentTransfers.map((t) => ({
            type: "transfer" as const,
            id: t.id,
            description: `Transferencia de ${t.originHotel.name} → ${t.destHotel.name}`,
            user: "Sistema",
            timestamp: t.createdAt,
            status: t.status,
        })),
        ...recentAssignments.map((a) => ({
            type: "assignment" as const,
            id: a.id,
            description: `Asignación: ${a.asset.type?.name || "Equipo"} (${a.asset.serial}) → ${a.collaborator?.name || a.collaboratorName}`,
            user: "Sistema",
            timestamp: a.assignedAt,
            status: a.status,
        })),
        ...recentLoans.map((l) => ({
            type: "loan" as const,
            id: l.id,
            description: `Préstamo: ${l.teamName || "Equipo"} → ${l.collaboratorName || l.collaboratorId}`,
            user: "Sistema",
            timestamp: l.startDate,
            status: l.returnDate ? "RETURNED" : "ACTIVE",
        })),
    ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10);

    const stats = {
        inventory: {
            total: totalAssets,
            assigned: assignedAssets,
            available: availableAssets,
            loaned: loanedAssets,
            disposed: disposedAssets,
        },
        transfers: {
            pending: pendingTransfersCount,
            active: activeTransfersCount,
        },
        general: {
            collaborators: totalCollaborators,
            hotels: activeHotels,
        },
        alerts: {
            expiredLoans,
            soonToExpireLoans,
            pendingTransfers: pendingTransfersCount,
        },
        recentActivity,
    };

    return NextResponse.json(stats);
});
