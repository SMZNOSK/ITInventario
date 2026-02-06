// src/app/api/loans/transfers/[id]/cancel/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/loans/transfers/:id/cancel
 * Cancela una transferencia de préstamos pendiente.
 */
export const POST = withError(
    async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
        const auth = await requireAuth(req);
        if (!auth.ok) return auth.res;

        const userId = auth.data.id;
        const { id } = await params;
        const transferId = parseInt(id, 10);

        if (!Number.isFinite(transferId) || transferId <= 0) {
            return NextResponse.json(
                { error: "ID de transferencia inválido" },
                { status: 400 }
            );
        }

        // 1. Buscar la transferencia
        const transfer = await prisma.loanTransfer.findUnique({
            where: { id: transferId },
            include: {
                originHotel: true,
                destHotel: true,
            },
        });

        if (!transfer) {
            return NextResponse.json(
                { error: "Transferencia no encontrada" },
                { status: 404 }
            );
        }

        // 2. Validar que esté en estado PENDING
        if (transfer.status !== "PENDING") {
            return NextResponse.json(
                {
                    error: `Esta transferencia ya fue ${transfer.status.toLowerCase()}. No se puede cancelar.`,
                },
                { status: 400 }
            );
        }

        // 3. Validar permisos:
        // - Usuario del hotel ORIGEN puede CANCELAR la transferencia
        // - Usuario del hotel DESTINO puede RECHAZAR la transferencia
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
                    {
                        error: "No tienes permisos para cancelar esta transferencia.",
                    },
                    { status: 403 }
                );
            }
        }

        // 4. Cancelar la transferencia
        const updatedTransfer = await prisma.loanTransfer.update({
            where: { id: transferId },
            data: {
                status: "CANCELED",
                canceledByUserId: userId,
                canceledAt: new Date(),
            },
            include: {
                originHotel: true,
                destHotel: true,
            },
        });

        return NextResponse.json({
            transfer: updatedTransfer,
            message: "Transferencia de préstamos cancelada exitosamente.",
        });
    }
);
