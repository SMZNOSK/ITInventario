// src/app/api/admin/sync-asset-status/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth, ensureRole } from "@/server/guards/auth";
import { prisma } from "@/lib/db";

/**
 * POST /api/admin/sync-asset-status
 * 
 * Sincroniza el estado de TODOS los activos basándose en las asignaciones activas.
 * 
 * Reglas:
 * 1. Si un activo tiene una asignación activa (Assignment, ManualAssignment o Loan) → status = "ASIGNADO"
 * 2. Si un activo tiene status "ASIGNADO" pero no tiene asignación activa → status = "ALTA"
 * 3. Si un activo está en estado "BAJA" o "TRANSFERENCIA_PENDIENTE", no se modifica
 * 
 * Solo accesible para usuarios con rol ADMIN.
 */
export const POST = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // Solo ADMIN puede ejecutar esta operación
    const deny = ensureRole(auth.data, "ADMIN");
    if (deny) return deny;

    // 1. Obtener todos los assetIds con asignaciones activas de las 3 fuentes

    // Assignment: status = "ASIGNADO"
    const activeAssignments = await prisma.assignment.findMany({
        where: { status: "ASIGNADO" },
        select: { assetId: true },
    });

    // ManualAssignment: status = "ASIGNADO"
    const activeManualAssignments = await prisma.manualAssignment.findMany({
        where: { status: "ASIGNADO" },
        select: { assetId: true },
    });

    // Loan: endDate > now (préstamo activo = fecha de fin en el futuro)
    const now = new Date();
    const activeLoans = await prisma.loan.findMany({
        where: { endDate: { gt: now } },
        select: { teamName: true, deviceName: true },
    });

    // Para Loans, necesitamos extraer el assetId del deviceName o teamName
    // El deviceName tiene formato: "LAP-000001 · S/N: SERIAL123" o similar
    const loanAssetIds: number[] = [];
    for (const loan of activeLoans) {
        const assetId = await extractAssetIdFromLoan(loan.deviceName, loan.teamName);
        if (assetId) loanAssetIds.push(assetId);
    }

    // Combinar todos los assetIds con asignación activa
    const activeAssetIds = new Set<number>([
        ...activeAssignments.map((a) => a.assetId),
        ...activeManualAssignments.map((a) => a.assetId),
        ...loanAssetIds,
    ]);

    // 2. Actualizar activos que DEBERÍAN estar como ASIGNADO pero no lo están
    const fixedToAsignado = await prisma.asset.updateMany({
        where: {
            id: { in: Array.from(activeAssetIds) },
            status: { not: "ASIGNADO" },
            // No tocar activos en BAJA o TRANSFERENCIA_PENDIENTE
            NOT: { status: { in: ["BAJA", "TRANSFERENCIA_PENDIENTE"] } },
        },
        data: { status: "ASIGNADO" },
    });

    // 3. Actualizar activos que están como ASIGNADO pero NO tienen asignación activa
    const assetsMarkedAsAsignado = await prisma.asset.findMany({
        where: { status: "ASIGNADO" },
        select: { id: true },
    });

    const shouldBeAltaIds = assetsMarkedAsAsignado
        .filter((a) => !activeAssetIds.has(a.id))
        .map((a) => a.id);

    const fixedToAlta = await prisma.asset.updateMany({
        where: { id: { in: shouldBeAltaIds } },
        data: { status: "ALTA" },
    });

    return NextResponse.json({
        ok: true,
        summary: {
            totalActiveAssignments: activeAssetIds.size,
            fixedToAsignado: fixedToAsignado.count,
            fixedToAlta: fixedToAlta.count,
        },
        message: `Sincronización completada. ${fixedToAsignado.count} activos marcados como ASIGNADO, ${fixedToAlta.count} activos devueltos a ALTA.`,
    });
});

/**
 * Extrae el assetId de un préstamo basándose en el deviceName o teamName.
 * Soporta formatos como "LAP-000001 · S/N: SERIAL123" o "S/N: SERIAL123"
 */
async function extractAssetIdFromLoan(
    deviceName: string | null,
    teamName: string | null
): Promise<number | null> {
    const str = deviceName || teamName || "";

    // Intentar extraer el serial del formato "S/N: SERIAL123"
    const snMatch = str.match(/S\/N:\s*([A-Za-z0-9-]+)/i);
    const serial = snMatch?.[1]?.trim();

    if (serial) {
        const asset = await prisma.asset.findFirst({
            where: { serial },
            select: { id: true },
        });
        if (asset) return asset.id;
    }

    // Intentar extraer el ID del formato "LAP-000001"
    const codeMatch = str.match(/([A-Za-z]{3})-(\d{6})/);
    if (codeMatch?.[2]) {
        const id = parseInt(codeMatch[2], 10);
        if (id > 0) {
            const asset = await prisma.asset.findUnique({
                where: { id },
                select: { id: true },
            });
            if (asset) return asset.id;
        }
    }

    return null;
}
