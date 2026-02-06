// src/app/api/admin/check-asset-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/check-asset-status
 * Verifica el estado de un equipo y lo corrige si no tiene asignaciones activas
 */
export const POST = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    if (auth.data.role !== "ADMIN") {
        return NextResponse.json(
            { error: "Solo administradores pueden ejecutar esta verificación" },
            { status: 403 }
        );
    }

    const { serial } = await req.json() as { serial: string };

    if (!serial || !serial.trim()) {
        return NextResponse.json(
            { error: "Debes proporcionar un serial" },
            { status: 400 }
        );
    }

    const trimmedSerial = serial.trim();

    // 1. Buscar el equipo
    const asset = await prisma.asset.findUnique({
        where: { serial: trimmedSerial },
        include: {
            type: { select: { name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
            currentHotel: { select: { name: true } },
        },
    });

    if (!asset) {
        return NextResponse.json(
            { error: `No se encontró equipo con serial ${trimmedSerial}` },
            { status: 404 }
        );
    }

    // 2. Verificar asignaciones activas (Assignment)
    const assignments = await prisma.assignment.findMany({
        where: {
            assetId: asset.id,
            status: "ASIGNADO",
        },
        include: {
            collaborator: { select: { name: true } },
        },
        orderBy: { assignedAt: "desc" },
    });

    // 3. Verificar asignaciones manuales activas
    const manualAssignments = await prisma.manualAssignment.findMany({
        where: {
            assetId: asset.id,
            status: "ASIGNADO",
        },
        orderBy: { assignedAt: "desc" },
    });

    // 4. Verificar préstamos activos (sin returnDate o returnDate en el futuro)
    const loans = await prisma.loan.findMany({
        where: {
            OR: [
                { deviceName: { contains: trimmedSerial, mode: "insensitive" } },
                { teamName: { contains: trimmedSerial, mode: "insensitive" } },
            ],
        },
        orderBy: { startDate: "desc" },
    });

    const activeLoans = loans.filter((loan) => !loan.returnDate || loan.returnDate > new Date());

    // 5. Determinar si el equipo debería estar en ALTA
    const hasActiveAssignments = assignments.length > 0;
    const hasActiveManualAssignments = manualAssignments.length > 0;
    const hasActiveLoans = activeLoans.length > 0;

    const shouldBeAlta = !hasActiveAssignments && !hasActiveManualAssignments && !hasActiveLoans;

    const results = {
        asset: {
            id: asset.id,
            serial: asset.serial,
            currentStatus: asset.status,
            type: asset.type?.name,
            brand: asset.brand?.name,
            model: asset.model?.name,
            hotel: asset.currentHotel?.name,
        },
        activeAssignments: assignments.map((a) => ({
            id: a.id,
            collaboratorId: a.collaboratorId,
            collaboratorName: a.collaboratorName || a.collaborator?.name,
            assignedAt: a.assignedAt.toISOString(),
            returnedAt: a.returnedAt?.toISOString(),
        })),
        activeManualAssignments: manualAssignments.map((ma) => ({
            id: ma.id,
            collaboratorName: ma.collaboratorName,
            collaboratorEmail: ma.collaboratorEmail,
            assignedAt: ma.assignedAt.toISOString(),
            returnedAt: ma.returnedAt?.toISOString(),
        })),
        activeLoans: activeLoans.map((l) => ({
            id: l.id,
            collaboratorId: l.collaboratorId,
            collaboratorName: l.collaboratorName,
            startDate: l.startDate.toISOString(),
            endDate: l.endDate.toISOString(),
            returnDate: l.returnDate?.toISOString(),
        })),
        analysis: {
            hasActiveAssignments,
            hasActiveManualAssignments,
            hasActiveLoans,
            shouldBeAlta,
            currentStatus: asset.status,
            needsStatusUpdate: shouldBeAlta && asset.status === "ASIGNADO",
        },
    };

    // 6. Si debe estar en ALTA y está ASIGNADO, corregir
    if (results.analysis.needsStatusUpdate) {
        await prisma.asset.update({
            where: { id: asset.id },
            data: { status: "ALTA" },
        });

        results.analysis.statusUpdated = true;
        results.analysis.newStatus = "ALTA";
    }

    return NextResponse.json({
        success: true,
        message: results.analysis.needsStatusUpdate
            ? `Estado corregido de ASIGNADO a ALTA para ${trimmedSerial}`
            : `Estado ${asset.status} es correcto para ${trimmedSerial}`,
        results,
    });
});
