// src/app/api/admin/fix-loan-assets/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/fix-loan-assets
 * Endpoint temporal para corregir el status de equipos específicos
 * y marcar sus préstamos como devueltos
 */
export const POST = withError(async (req: NextRequest) => {
    // Requiere autenticación
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const { serials } = await req.json() as { serials: string[] };

    if (!serials || !Array.isArray(serials) || serials.length === 0) {
        return NextResponse.json(
            { error: "Debes proporcionar un array de serials" },
            { status: 400 }
        );
    }

    const results = {
        assetsUpdated: 0,
        loansUpdated: 0,
        details: [] as any[],
    };

    await prisma.$transaction(async (tx) => {
        for (const serial of serials) {
            const trimmedSerial = serial.trim();
            if (!trimmedSerial) continue;

            // 1. Actualizar el asset a ALTA
            const assetResult = await tx.asset.updateMany({
                where: {
                    serial: trimmedSerial,
                    status: "ASIGNADO",
                },
                data: {
                    status: "ALTA",
                },
            });

            results.assetsUpdated += assetResult.count;

            // 2. Encontrar préstamos asociados a este serial y marcarlos como devueltos
            // Buscar préstamos donde deviceName o teamName contengan este serial
            const loans = await tx.loan.findMany({
                where: {
                    OR: [
                        { deviceName: { contains: trimmedSerial, mode: "insensitive" } },
                        { teamName: { contains: trimmedSerial, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true,
                    endDate: true,
                    deviceName: true,
                },
            });

            // Marcar como devueltos (poner endDate a hoy si aún no pasó)
            const now = new Date();
            for (const loan of loans) {
                const endDate = loan.endDate;

                // Si la fecha de devolución es futura, actualizarla a hoy
                if (endDate > now) {
                    await tx.loan.update({
                        where: { id: loan.id },
                        data: { endDate: now },
                    });
                    results.loansUpdated++;
                }
            }

            results.details.push({
                serial: trimmedSerial,
                assetsFixed: assetResult.count,
                loansFound: loans.length,
                loansMarkedAsReturned: loans.filter(l => l.endDate > now).length,
            });
        }
    });

    return NextResponse.json({
        success: true,
        message: `Se corrigieron ${results.assetsUpdated} assets y ${results.loansUpdated} préstamos`,
        results,
    });
});
