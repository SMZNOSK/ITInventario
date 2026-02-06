// src/app/api/assignments/manual/pdf/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";
import { generateManualAssignmentPDF } from "@/server/services/pdfGenerator";

/**
 * GET /api/assignments/manual/pdf?key=encodedKey
 * Genera un PDF del resguardo de asignaciones manuales para un colaborador
 */
export const GET = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // Obtener key desde query parameter
    const searchParams = req.nextUrl.searchParams;
    const encodedKey = searchParams.get('key');

    if (!encodedKey) {
        return NextResponse.json(
            { error: "Falta el parámetro 'key'" },
            { status: 400 }
        );
    }

    const key = decodeURIComponent(encodedKey);

    // Normalizar clave
    const normalizedKey = key.trim().toLowerCase();

    // Obtener nombre del ingeniero autenticado
    const engineer = await prisma.user.findUnique({
        where: { id: auth.data.id },
        select: { name: true },
    });

    const engineerName = engineer?.name || "Ingeniero de TI";

    // Obtener todas las asignaciones manuales activas
    const allAssignments = await prisma.manualAssignment.findMany({
        where: {
            status: "ASIGNADO",
        },
        include: {
            asset: {
                include: {
                    type: true,
                    brand: true,
                    model: true,
                },
            },
        },
    });

    // Filtrar asignaciones que coincidan con la clave
    const matchingAssignments = allAssignments.filter((a) => {
        const name = String(a.collaboratorName || "").trim();
        const email = String(a.collaboratorEmail || "").trim();
        const dept = String(a.department || "").trim();

        // Extraer partes del normalizedKey (name||email||hotel||dept)
        const parts = normalizedKey.split("||");
        const searchName = (parts[0] || "").trim();
        const searchEmail = (parts[1] || "").trim();
        const searchDept = (parts[3] || "").trim();

        // Comparar
        const match1 = name.toLowerCase() === searchName &&
            email.toLowerCase() === searchEmail &&
            dept.toLowerCase() === searchDept;

        const match2 = name.toLowerCase() === searchName &&
            email.toLowerCase() === searchEmail;

        const match3 = name.toLowerCase() === searchName;

        return match1 || match2 || match3;
    });

    if (matchingAssignments.length === 0) {
        return NextResponse.json(
            { error: "No se encontraron asignaciones activas para este colaborador." },
            { status: 404 }
        );
    }

    // Obtener información del primer registro (todos deberían tener los mismos datos del colaborador)
    const firstAssignment = matchingAssignments[0];

    // Preparar datos para el PDF
    const pdfData = {
        collaboratorName: firstAssignment.collaboratorName,
        collaboratorEmail: firstAssignment.collaboratorEmail,
        hotelName: firstAssignment.hotel || null,
        departmentName: firstAssignment.department || null,
        assignedAt: firstAssignment.assignedAt,
        engineerName,
        equipment: matchingAssignments.map((a) => ({
            type: a.asset?.type?.name || null,
            brand: a.asset?.brand?.name || null,
            model: a.asset?.model?.name || null,
            serial: a.asset?.serial || "S/N",
        })),
    };

    // Generar PDF
    const pdfBytes = await generateManualAssignmentPDF(pdfData);

    // Crear nombre de archivo sanitizado
    const sanitizedName = firstAssignment.collaboratorName
        .replace(/[^a-zA-Z0-9]/g, "_")
        .substring(0, 50);

    const filename = `Resguardo_Manual_${sanitizedName}.pdf`;

    // Retornar PDF
    return new NextResponse(pdfBytes, {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${filename}"`,
        },
    });
});
