// src/app/api/assignments/[id]/pdf/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";
import { generateAssignmentPDF } from "@/server/services/pdfGenerator";

type ParamsContext = {
    params: Promise<{ id: string }>;
};

// GET /api/assignments/[id]/pdf
export const GET = withError(
    async (req: NextRequest, context: ParamsContext) => {
        // 1. Autenticación
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const { id } = await context.params;
        const collaboratorId = id;

        if (!collaboratorId) {
            return NextResponse.json(
                { message: "ID de colaborador requerido" },
                { status: 400 }
            );
        }

        // 2. Validar que el collaboratorId es numérico (solo asignaciones normales por ahora)
        if (isNaN(Number(collaboratorId))) {
            return NextResponse.json(
                { message: "Solo disponible para resguardos con número de colaborador" },
                { status: 403 }
            );
        }

        // 3. Obtener las asignaciones del colaborador (solo ASIGNADO)
        const assignments = await prisma.assignment.findMany({
            where: {
                collaboratorId,
                status: "ASIGNADO",
            },
            include: {
                asset: {
                    include: {
                        type: true,
                        brand: true,
                        model: true,
                        currentHotel: true,
                    },
                },
                department: true,
                collaborator: true,
                createdBy: true, // Usuario que creó la asignación
            },
            orderBy: {
                assignedAt: "asc",
            },
        });

        // 4. Validar que hay equipos asignados
        if (assignments.length === 0) {
            return NextResponse.json(
                { message: "No hay equipos asignados a este colaborador" },
                { status: 409 }
            );
        }

        const firstAssignment = assignments[0];

        // 5. Validar acceso por hotel (scope)
        // El usuario debe tener acceso al hotel del colaborador
        // TODO: Implementar validación de hotel scope basado en auth.data
        // Por ahora permitimos a todos los usuarios autenticados

        // 6. Preparar datos para el PDF
        const collaboratorName = firstAssignment.collaboratorName || collaboratorId;
        const hotelName = firstAssignment.asset.currentHotel?.name || null;
        const departmentName = firstAssignment.department?.name || null;
        const teamName = firstAssignment.collaborator?.teamName || null;
        const assignedAt = new Date(firstAssignment.assignedAt);

        // Obtener el nombre del ingeniero que está generando el PDF (usuario actual logeado)
        const currentUser = await prisma.user.findUnique({
            where: { id: auth.data.id },
            select: { name: true },
        });
        const engineerName = currentUser?.name || firstAssignment.createdBy?.name || "Soporte Técnico";

        const equipment = assignments.map((a) => ({
            type: a.asset.type?.name || null,
            brand: a.asset.brand?.name || null,
            model: a.asset.model?.name || null,
            serial: a.asset.serial || "SIN-SERIE",
        }));

        // 7. Generar PDF
        const pdfBytes = await generateAssignmentPDF({
            collaboratorId,
            collaboratorName,
            hotelName,
            departmentName,
            teamName,
            assignedAt,
            equipment,
            engineerName,
        });

        // 8. Retornar PDF con headers correctos
        const today = new Date().toISOString().split("T")[0];
        const filename = `RESGUARDO_${collaboratorId}_${today}.pdf`;

        return new NextResponse(pdfBytes, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-store, no-cache, must-revalidate",
                "Pragma": "no-cache",
            },
        });
    }
);
