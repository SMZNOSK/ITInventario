// src/app/api/loans/[id]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { generateLoanPDF } from "@/server/services/pdfGenerator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParamsContext = {
    params: Promise<{
        id: string;
    }>;
};

/**
 * GET /api/loans/[id]/pdf
 * Genera y descarga un PDF de préstamo
 */
export const GET = withError(
    async (req: NextRequest, context: ParamsContext) => {
        // 1. Autenticación
        const auth = await requireAuth(req);
        if (auth.error) return auth.error;

        const { id } = await context.params;
        const loanId = id;

        if (!loanId) {
            return NextResponse.json(
                { message: "ID de préstamo requerido" },
                { status: 400 }
            );
        }

        // Validar que sea un ID numérico
        const numericId = Number(loanId);
        if (isNaN(numericId) || numericId <= 0) {
            return NextResponse.json(
                { message: "ID de préstamo inválido" },
                { status: 400 }
            );
        }

        // 2. Obtener datos del préstamo
        const loan = await prisma.loan.findUnique({
            where: { id: numericId },
            include: {
                hotel: { select: { name: true } },
            },
        });

        if (!loan) {
            return NextResponse.json(
                { message: "Préstamo no encontrado" },
                { status: 404 }
            );
        }

        // Extraer datos del préstamo (campos dinámicos)
        const loanData = loan as any;

        const collaboratorId = loanData.collaboratorId || "";
        const collaboratorName = loanData.collaboratorName || null;
        const hotelName = loan.hotel?.name || loanData.hotelName || null;
        const departmentName = loanData.departmentName || null;
        const teamName = loanData.teamName || null;
        const deviceName = loanData.deviceName || null;

        // ✅ Obtener nombre del ingeniero desde la base de datos
        const loggedInUser = await prisma.user.findUnique({
            where: { id: auth.data.id },
            select: { name: true },
        });
        const engineerName = loggedInUser?.name || "Soporte Técnico";

        // 3. Obtener SOLO los equipos prestados ACTIVOS al colaborador
        // Estrategia mejorada: buscar por múltiples patrones de serial
        const allLoans = await prisma.loan.findMany({
            where: {
                collaboratorId: collaboratorId,
            },
            select: {
                id: true,
                teamName: true,
                deviceName: true,
            },
        });

        console.log(`\n========== DEBUG PDF PRÉSTAMO ==========`);
        console.log(`Colaborador: ${collaboratorId}`);
        console.log(`Total préstamos encontrados: ${allLoans.length}`);
        allLoans.forEach(loan => {
            console.log(`  Préstamo #${loan.id}:`);
            console.log(`    teamName: "${loan.teamName}"`);
            console.log(`    deviceName: "${loan.deviceName}"`);
        });

        const equipment: Array<{
            type: string | null;
            brand: string | null;
            model: string | null;
            serial: string;
        }> = [];

        // Función mejorada para extraer serial de un string
        function extractSerial(text: string | null): string | null {
            if (!text) return null;

            console.log(`    Intentando extraer serial de: "${text}"`);

            // Patrón 1: "S/N: SERIAL" o "Serial: SERIAL"
            let match = text.match(/(?:S\/N|Serial|SN|SERIE|No\.?\s*Serie)[:\s]+([A-Za-z0-9-]+)/i);
            if (match) {
                console.log(`      ✓ Patrón 1 encontrado: "${match[1].trim()}"`);
                return match[1].trim();
            }

            // Patrón 2: "LAP-000001 · SERIAL" (después del separador ·)
            match = text.match(/[·•]\s*([A-Za-z0-9]+)/);
            if (match) {
                console.log(`      ✓ Patrón 2 encontrado: "${match[1].trim()}"`);
                return match[1].trim();
            }

            // Patrón 3: Cualquier alfanumérico de 6+ caracteres que NO sea un código de equipo
            const tokens = text.split(/[^A-Za-z0-9-]+/).filter(t => t.length >= 6);
            console.log(`      Tokens encontrados (6+ chars): ${JSON.stringify(tokens)}`);

            for (const token of tokens) {
                // Ignorar códigos de equipo como "LAP-000001"
                if (!/^[A-Z]{3}-\d{6}$/i.test(token)) {
                    console.log(`      ✓ Patrón 3 encontrado: "${token.trim()}"`);
                    return token.trim();
                } else {
                    console.log(`      ✗ Token "${token}" ignorado (código de equipo)`);
                }
            }

            console.log(`      ✗ No se encontró serial`);
            return null;
        }

        // Procesar cada préstamo para extraer información del equipo ACTIVO
        for (const loanItem of allLoans) {
            const loanDeviceName = (loanItem as any).deviceName || null;
            const loanTeamName = (loanItem as any).teamName || null;

            console.log(`\n  Procesando préstamo #${loanItem.id}:`);

            // Intentar extraer serial del deviceName primero, luego teamName
            let serial = extractSerial(loanDeviceName);
            if (!serial) {
                console.log(`    Intentando con teamName...`);
                serial = extractSerial(loanTeamName);
            }

            if (!serial) {
                console.warn(`    ❌ ERROR: No se pudo extraer serial del préstamo ${loanItem.id}`);
                console.warn(`       deviceName: "${loanDeviceName}"`);
                console.warn(`       teamName: "${loanTeamName}"`);
                continue;
            }

            console.log(`    Serial extraído: "${serial}"`);


            // Buscar el asset con este serial que esté en estatus ASIGNADO
            const foundAsset = await prisma.asset.findFirst({
                where: {
                    serial: serial,
                    status: "ASIGNADO" // ✅ Solo incluir equipos en préstamo activo
                },
                include: {
                    type: { select: { name: true } },
                    brand: { select: { name: true } },
                    model: { select: { name: true } },
                },
            });

            // Si encontramos el asset en la BD y está en estatus ASIGNADO, agregarlo
            if (foundAsset) {
                console.log(`    ✓ Asset encontrado: ${foundAsset.type?.name} - ${foundAsset.serial} (status: ${foundAsset.status})`);
                equipment.push({
                    type: foundAsset.type?.name || null,
                    brand: foundAsset.brand?.name || null,
                    model: foundAsset.model?.name || null,
                    serial: foundAsset.serial,
                });
            } else {
                console.warn(`    ❌ Asset no encontrado o no está en ASIGNADO para serial: "${serial}"`);
            }
        }

        console.log(`\nTotal equipos agregados al PDF: ${equipment.length}`);
        console.log(`========================================\n`);

        // Validar que haya equipos
        if (equipment.length === 0) {
            return NextResponse.json(
                { message: "El colaborador no tiene equipos en préstamo activos" },
                { status: 400 }
            );
        }

        // 4. Generar PDF
        const pdfData = {
            collaboratorId,
            collaboratorName,
            hotelName,
            departmentName,
            teamName,
            loanStartDate: loan.startDate,
            loanReturnDate: loan.endDate,
            engineerName,
            equipment,
        };

        try {
            const pdfBytes = await generateLoanPDF(pdfData);

            // 5. Retornar PDF con headers apropiados
            const filename = `prestamo_${collaboratorId}_${loan.startDate.toISOString().split('T')[0]}.pdf`;

            return new NextResponse(pdfBytes, {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            });
        } catch (error) {
            console.error("Error generating loan PDF:", error);
            return NextResponse.json(
                { message: "Error al generar el PDF", error: String(error) },
                { status: 500 }
            );
        }
    }
);
