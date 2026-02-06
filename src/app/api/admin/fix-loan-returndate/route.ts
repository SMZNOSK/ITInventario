// src/app/api/admin/fix-loan-returndate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/fix-loan-returndate
 * Endpoint para resetear returnDate de préstamos que fueron marcados incorrectamente
 * como devueltos mientras sus activos siguen en estado ASIGNADO
 */
export const POST = withError(async (req: NextRequest) => {
    // Requiere autenticación de ADMIN
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    if (auth.data.role !== "ADMIN") {
        return NextResponse.json(
            { error: "Solo administradores pueden ejecutar este fix" },
            { status: 403 }
        );
    }

    const { collaboratorId, serials } = await req.json() as {
        collaboratorId?: string;
        serials?: string[]
    };

    if (!collaboratorId && (!serials || serials.length === 0)) {
        return NextResponse.json(
            { error: "Debes proporcionar collaboratorId o un array de serials" },
            { status: 400 }
        );
    }

    const results = {
        loansFixed: 0,
        loansChecked: 0,
        details: [] as any[],
    };

    await prisma.$transaction(async (tx) => {
        // Encontrar préstamos problemáticos
        let loans;

        if (collaboratorId) {
            // Buscar por colaborador
            loans = await tx.loan.findMany({
                where: {
                    collaboratorId,
                    returnDate: { not: null },
                },
                select: {
                    id: true,
                    collaboratorId: true,
                    collaboratorName: true,
                    deviceName: true,
                    teamName: true,
                    returnDate: true,
                },
            });
        } else {
            // Buscar por serials
            loans = await tx.loan.findMany({
                where: {
                    returnDate: { not: null },
                    OR: serials!.flatMap((serial) => [
                        { deviceName: { contains: serial, mode: "insensitive" } },
                        { teamName: { contains: serial, mode: "insensitive" } },
                    ]),
                },
                select: {
                    id: true,
                    collaboratorId: true,
                    collaboratorName: true,
                    deviceName: true,
                    teamName: true,
                    returnDate: true,
                },
            });
        }

        results.loansChecked = loans.length;

        // Para cada préstamo, verificar si el activo sigue ASIGNADO
        for (const loan of loans) {
            // Extraer serial del deviceName o teamName
            const deviceText = loan.deviceName || loan.teamName || "";
            const serialMatch = deviceText.match(/(?:S\/N|SN|SERIAL|·)\s*:?\s*([A-Za-z0-9-]+)/i);

            if (!serialMatch) {
                results.details.push({
                    loanId: loan.id,
                    message: "No se pudo extraer serial del deviceName/teamName",
                    deviceName: loan.deviceName,
                    teamName: loan.teamName,
                    fixed: false,
                });
                continue;
            }

            const serial = serialMatch[1].trim();

            // Buscar el activo por serial
            const asset = await tx.asset.findUnique({
                where: { serial },
                select: { serial: true, status: true },
            });

            if (!asset) {
                results.details.push({
                    loanId: loan.id,
                    serial,
                    message: "Activo no encontrado",
                    fixed: false,
                });
                continue;
            }

            // Si el activo está ASIGNADO, resetear returnDate
            if (asset.status === "ASIGNADO") {
                await tx.loan.update({
                    where: { id: loan.id },
                    data: { returnDate: null },
                });

                results.loansFixed++;
                results.details.push({
                    loanId: loan.id,
                    serial: asset.serial,
                    assetStatus: asset.status,
                    message: "returnDate reseteado exitosamente",
                    fixed: true,
                });
            } else {
                results.details.push({
                    loanId: loan.id,
                    serial: asset.serial,
                    assetStatus: asset.status,
                    message: "Activo no está ASIGNADO, no se requiere fix",
                    fixed: false,
                });
            }
        }
    });

    return NextResponse.json({
        success: true,
        message: `Se verificaron ${results.loansChecked} préstamos y se corrigieron ${results.loansFixed}`,
        results,
    });
});
