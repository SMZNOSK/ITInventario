// src/app/api/loans/transfers/[id]/accept/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/loans/transfers/:id/accept
 * Acepta una transferencia de préstamos pendiente.
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
                    error: `Esta transferencia ya fue ${transfer.status.toLowerCase()}. No se puede aceptar.`,
                },
                { status: 400 }
            );
        }

        // 3. Validar permisos (usuario debe tener acceso al hotel destino)
        if (auth.data.role !== "ADMIN") {
            const hasAccess = await prisma.userHotel.findFirst({
                where: {
                    userId,
                    hotelId: transfer.destHotelId,
                },
            });

            if (!hasAccess) {
                return NextResponse.json(
                    {
                        error:
                            "No tienes permisos para aceptar transferencias en este hotel.",
                    },
                    { status: 403 }
                );
            }
        }

        // 4. Obtener todos los préstamos activos del colaborador EN EL HOTEL DE ORIGEN
        const activeLoans = await prisma.loan.findMany({
            where: {
                collaboratorId: transfer.collaboratorId,
                hotelId: transfer.originHotelId,
                returnDate: null, // Solo préstamos no devueltos
            },
        });

        if (activeLoans.length === 0) {
            return NextResponse.json(
                {
                    error:
                        `El colaborador no tiene préstamos activos en ${transfer.originHotel.name}. La transferencia no se puede completar.`,
                },
                { status: 400 }
            );
        }

        const loanIds = activeLoans.map((loan) => loan.id);

        // 5. Ejecutar en transacción: actualizar transferencia + actualizar préstamos
        const result = await prisma.$transaction(async (tx) => {
            // Actualizar el hotel de todos los préstamos
            await tx.loan.updateMany({
                where: {
                    id: { in: loanIds },
                },
                data: {
                    hotelId: transfer.destHotelId,
                    hotelName: transfer.destHotel.name,
                },
            });

            // Actualizar la transferencia como aceptada
            const updatedTransfer = await tx.loanTransfer.update({
                where: { id: transferId },
                data: {
                    status: "ACCEPTED",
                    acceptedByUserId: userId,
                    acceptedAt: new Date(),
                },
                include: {
                    originHotel: true,
                    destHotel: true,
                },
            });

            return updatedTransfer;
        });

        return NextResponse.json({
            transfer: result,
            message: `Transferencia aceptada. ${activeLoans.length} préstamo(s) transferidos a ${transfer.destHotel.name}.`,
            loanCount: activeLoans.length,
        });
    }
);
