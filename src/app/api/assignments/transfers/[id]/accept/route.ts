// src/app/api/assignments/transfers/[id]/accept/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";


/**
 * POST /api/assignments/transfers/:id/accept
 * Acepta una transferencia de asignaciones pendiente.
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
        const transfer = await prisma.assignmentTransfer.findUnique({
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

        // 4. Obtener todos los equipos asignados al colaborador EN EL HOTEL DE ORIGEN
        const assignments = await prisma.assignment.findMany({
            where: {
                collaboratorId: transfer.collaboratorId,
                status: "ASIGNADO",
            },
            include: {
                asset: true,
            },
        });

        // Filtrar solo los que están actualmente en el hotel de origen
        const assignmentsInOriginHotel = assignments.filter(
            (a) => a.asset.currentHotelId === transfer.originHotelId
        );

        if (assignmentsInOriginHotel.length === 0) {
            return NextResponse.json(
                {
                    error:
                        `El colaborador no tiene asignaciones activas en ${transfer.originHotel.name}. La transferencia no se puede completar.`,
                },
                { status: 400 }
            );
        }

        const assetIds = assignmentsInOriginHotel.map((a) => a.asset.id);

        // 5. Ejecutar en transacción: actualizar transferencia + actualizar assets
        const result = await prisma.$transaction(async (tx) => {
            // Actualizar el hotel de todos los equipos
            await tx.asset.updateMany({
                where: {
                    id: { in: assetIds },
                },
                data: {
                    currentHotelId: transfer.destHotelId,
                },
            });

            // Actualizar la transferencia como aceptada
            const updatedTransfer = await tx.assignmentTransfer.update({
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
            message: `Transferencia aceptada. ${assignmentsInOriginHotel.length} equipo(s) transferidos a ${transfer.destHotel.name}.`,
            equipmentCount: assignmentsInOriginHotel.length,
        });
    }
);
