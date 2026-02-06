// src/app/api/assignments/manual/transfers/[id]/accept/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/assignments/manual/transfers/[id]/accept
 * Acepta una transferencia de asignaciones manuales pendiente.
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

        // 2. Validar permisos (debe tener acceso al hotel destino)
        if (auth.data.role !== "ADMIN") {
            const hasAccess = await prisma.userHotel.findFirst({
                where: {
                    userId,
                    hotelId: transfer.destHotelId,
                },
            });

            if (!hasAccess) {
                return NextResponse.json(
                    { error: "No tienes permisos para aceptar transferencias a este hotel." },
                    { status: 403 }
                );
            }
        }

        // 3. Obtener todas las asignaciones manuales que coincidan con la clave
        const allAssignments = await prisma.manualAssignment.findMany({
            where: {
                status: "ASIGNADO",
            },
        });

        const matchingAssignments = allAssignments.filter((a) => {
            const name = String(a.collaboratorName || "").trim();
            const email = String(a.collaboratorEmail || "").trim();
            const dept = String(a.department || "").trim();
            const assignmentHotel = String(a.hotel || "").trim();

            // Extraer partes de la clave guardada (name||email||hotel||dept)
            const keyParts = transfer.collaboratorKey.split("||");
            const searchName = (keyParts[0] || "").trim();
            const searchEmail = (keyParts[1] || "").trim();
            const searchDept = (keyParts[3] || "").trim();

            // Comparar colaborador
            const match1 = name.toLowerCase() === searchName.toLowerCase() &&
                email.toLowerCase() === searchEmail.toLowerCase() &&
                dept.toLowerCase() === searchDept.toLowerCase();

            const match2 = name.toLowerCase() === searchName.toLowerCase() &&
                email.toLowerCase() === searchEmail.toLowerCase();

            const match3 = name.toLowerCase() === searchName.toLowerCase();

            const collaboratorMatches = match1 || match2 || match3;

            // IMPORTANTE: Verificar que esté en el hotel de origen
            const hotelMatches = assignmentHotel.toLowerCase() === transfer.originHotel.name.toLowerCase();

            return collaboratorMatches && hotelMatches;
        });

        if (matchingAssignments.length === 0) {
            return NextResponse.json(
                { error: `No se encontraron asignaciones manuales activas para este colaborador en ${transfer.originHotel.name}.` },
                { status: 400 }
            );
        }

        // 4. Actualizar en transacción
        await prisma.$transaction(async (tx) => {
            // Actualizar todas las asignaciones manuales al nuevo hotel
            for (const assignment of matchingAssignments) {
                await tx.manualAssignment.update({
                    where: { id: assignment.id },
                    data: {
                        hotel: transfer.destHotel.name,
                    },
                });
            }

            // Actualizar el estado de la transferencia
            await tx.manualAssignmentTransfer.update({
                where: { id: transferId },
                data: {
                    status: "ACCEPTED",
                    acceptedByUserId: userId,
                    acceptedAt: new Date(),
                },
            });
        });

        return NextResponse.json({
            message: `Transferencia aceptada. ${matchingAssignments.length} asignación(es) transferida(s) a ${transfer.destHotel.name}.`,
            assignmentCount: matchingAssignments.length,
        });
    })();
}
