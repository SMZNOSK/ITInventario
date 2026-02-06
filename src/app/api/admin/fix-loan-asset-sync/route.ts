// src/app/api/admin/fix-loan-asset-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import { requireAuth, ensureRole } from "@/server/guards/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNoStoreJson(data: any, status = 200) {
    return NextResponse.json(data, {
        status,
        headers: { "Cache-Control": "no-store" },
    });
}

function cleanText(raw: any): string {
    return String(raw ?? "").trim();
}

/**
 * Extrae el serial desde teamName o deviceName
 * Formatos soportados:
 *  - "LAP-000001 · S/N: POIUHGVB11"
 *  - "LAP-000001 · POIUHGVB11"
 *  - "S/N: POIUHGVB11"
 */
function extractSerialFromLoanField(raw: any): string | null {
    const s = cleanText(raw);
    if (!s) return null;

    // Buscar serial después de marcadores S/N:, SN:, SERIAL:, SERIE:
    const snMatch = s.match(/(?:S\/N|SN|SERIAL|SERIE)\s*[:#]?\s*([A-Za-z0-9-]+)/i);
    if (snMatch?.[1]) return snMatch[1].trim();

    // Fallback: buscar después del separador " · "
    const parts = s.split("·");
    if (parts.length >= 2) {
        const afterSeparator = parts[1].trim();
        // Remover marcadores comunes
        const cleaned = afterSeparator.replace(/^(S\/N|SN|SERIAL|SERIE)\s*[:#]?\s*/i, "");
        const tokens = cleaned.split(/\s+/).filter(Boolean);
        if (tokens.length > 0 && tokens[0].length >= 4) {
            return tokens[0];
        }
    }

    return null;
}

// POST /api/admin/fix-loan-asset-sync
export const POST = withError(async (req: NextRequest) => {
    // ✅ Requiere autenticación
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // ✅ Solo ADMIN puede ejecutar esta corrección
    const deny = ensureRole(auth.data, "ADMIN");
    if (deny) return deny;

    const now = new Date();

    // 1) Buscar todos los préstamos que están marcados como devueltos (endDate < now)
    const returnedLoans = await prisma.loan.findMany({
        where: {
            endDate: { lt: now },
        },
        select: {
            id: true,
            collaboratorId: true,
            collaboratorName: true,
            teamName: true,
            deviceName: true,
            endDate: true,
        },
        orderBy: { endDate: "desc" },
    });

    const report = {
        totalReturnedLoans: returnedLoans.length,
        serialsExtracted: 0,
        assetsFound: 0,
        assetsFixed: 0,
        assetsAlreadyOk: 0,
        assetsNotFound: 0,
        details: [] as any[],
    };

    // 2) Para cada préstamo, extraer el serial y actualizar el activo si está ASIGNADO
    for (const loan of returnedLoans) {
        // Intentar extraer serial desde deviceName primero (es el campo principal)
        let serial = extractSerialFromLoanField(loan.deviceName);

        // Fallback: intentar desde teamName
        if (!serial) {
            serial = extractSerialFromLoanField(loan.teamName);
        }

        const detail: any = {
            loanId: loan.id,
            collaboratorId: loan.collaboratorId,
            collaboratorName: loan.collaboratorName,
            deviceName: loan.deviceName,
            teamName: loan.teamName,
            endDate: loan.endDate.toISOString(),
            serial,
            assetFound: false,
            previousStatus: null,
            newStatus: null,
            action: "no_action",
        };

        if (!serial) {
            detail.action = "serial_not_found";
            report.details.push(detail);
            continue;
        }

        report.serialsExtracted++;

        // 3) Buscar el activo por serial
        const asset = await prisma.asset.findUnique({
            where: { serial },
            select: { id: true, serial: true, status: true },
        });

        if (!asset) {
            detail.action = "asset_not_found";
            report.assetsNotFound++;
            report.details.push(detail);
            continue;
        }

        detail.assetFound = true;
        detail.assetId = asset.id;
        detail.previousStatus = asset.status;
        report.assetsFound++;

        // 4) Si el activo está ASIGNADO, actualizarlo a ALTA
        if (asset.status === "ASIGNADO") {
            await prisma.asset.update({
                where: { id: asset.id },
                data: { status: "ALTA" },
            });

            detail.newStatus = "ALTA";
            detail.action = "fixed";
            report.assetsFixed++;
        } else if (asset.status === "ALTA") {
            detail.newStatus = "ALTA";
            detail.action = "already_ok";
            report.assetsAlreadyOk++;
        } else {
            detail.newStatus = asset.status;
            detail.action = "other_status";
        }

        report.details.push(detail);
    }

    return toNoStoreJson({
        success: true,
        message: `Sincronización completada. ${report.assetsFixed} activos corregidos de ${report.totalReturnedLoans} préstamos devueltos.`,
        report,
    });
});
