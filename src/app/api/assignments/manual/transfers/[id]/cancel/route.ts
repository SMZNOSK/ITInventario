// src/app/api/assignments/manual/transfers/[id]/cancel/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/assignments/manual/transfers/[id]/cancel
 * Cancela/rechaza una transferencia de asignaciones manuales pendiente.
 */
export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    return withError(async () => {
        const auth = await requireAuth(req);
        if (!auth.ok) return auth.res;

        const userId = auth.data.id;
        const params = await context.params;
        const transferId = parseInt(params.id, 10);

        if (isNaN(transferId)) {
            return NextResponse.json({ error: "ID de transferencia inválido" }, { status: 400 });
        }

        // 1. Buscar la transferencia
        const transfer = await prisma.manualAssignmentTransfer.findUnique({
            where: { id: transferId },
            include: {
                originHotel: true,
                destHotel: true,
            },
        });

        if (!transfer) {
            return NextResponse.json({ error: "Transferencia no encontrada" }, { status: 404 });
        }

        if (transfer.status !== "PENDING") {
            return NextResponse.json(
                { error: `Esta transferencia ya fue ${transfer.status.toLowerCase()}` },
                { status: 400 }
            );
        }

        // 2. Validar permisos (debe tener acceso al hotel origen o destino, o ser admin)
        if (auth.data.role !== "ADMIN") {
            const hasAccessOrigin = await prisma.userHotel.findFirst({
                where: {
                    userId,
                    hotelId: transfer.originHotelId,
                },
            });

            const hasAccessDest = await prisma.userHotel.findFirst({
                where: {
                    userId,
                    hotelId: transfer.destHotelId,
                },
            });

            if (!hasAccessOrigin && !hasAccessDest) {
                return NextResponse.json(
                    { error: "No tienes permisos para cancelar esta transferencia." },
                    { status: 403 }
                );
            }
        }

        // 3. Determinar si es cancelación o rechazo
        const isOriginUser = auth.data.role === "ADMIN" || auth.data.hotels.includes(transfer.originHotelId);
        const newStatus = isOriginUser ? "CANCELED" : "REJECTED";
        const userIdField = isOriginUser ? "canceledByUserId" : "rejectedByUserId";
        const timestampField = isOriginUser ? "canceledAt" : "rejectedAt";

        // 4. Actualizar la transferencia
        await prisma.manualAssignmentTransfer.update({
            where: { id: transferId },
            data: {
                status: newStatus,
                [userIdField]: userId,
                [timestampField]: new Date(),
            },
        });

        return NextResponse.json({
            message: `Transferencia ${newStatus === "CANCELED" ? "cancelada" : "rechazada"}.`,
        });
    })();
}
