// scripts/fix-loan-sync.ts
// Script para corregir la sincronización entre préstamos y activos

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function cleanText(raw: any): string {
    return String(raw ?? '').trim();
}

/**
 * Extrae serial desde deviceName
 * Formatos soportados:
 *  - "LAP-000001 · S/N: POIUHGVB11"
 *  - "LAP-000001 · POIUHGVB11"
 */
function extractSerialFromDeviceName(raw: any): string | null {
    const s = cleanText(raw);
    if (!s) return null;

    // Buscar patrón S/N:, SN:, SERIAL:
    const snMatch = s.match(/(?:S\/N|SN|SERIAL|SERIE)\s*[:#]?\s*([A-Za-z0-9-]+)/i);
    if (snMatch?.[1]) return snMatch[1].trim();

    // Fallback: buscar después del separador " · "
    const parts = s.split('·');
    if (parts.length >= 2) {
        const afterSeparator = parts[1].trim();
        const tokens = afterSeparator.split(/[^A-Za-z0-9-]+/).filter(Boolean);
        const stop = new Set(['SN', 'S', 'N', 'SERIAL', 'SERIE', 'NO']);
        const candidates = tokens.filter(t => !stop.has(t.toUpperCase()) && t.length >= 4);
        if (candidates.length > 0) return candidates[0];
    }

    return null;
}

async function main() {
    console.log('🔍 Iniciando corrección de sincronización de préstamos...\n');

    // 1. Obtener todos los préstamos
    const loans = await prisma.loan.findMany({
        select: {
            id: true,
            deviceName: true,
            teamName: true,
            endDate: true,
            returnDate: true,
            collaboratorId: true,
            collaboratorName: true,
        },
    });

    console.log(`📊 Total de préstamos encontrados: ${loans.length}\n`);

    let fixed = 0;
    let errors = 0;

    for (const loan of loans) {
        // Extraer serial del préstamo
        const serial = extractSerialFromDeviceName(loan.deviceName || loan.teamName);

        if (!serial) {
            console.log(`⚠️  Préstamo ID ${loan.id}: No se pudo extraer serial`);
            continue;
        }

        // Buscar el activo asociado
        const asset = await prisma.asset.findUnique({
            where: { serial },
            select: { id: true, serial: true, status: true },
        });

        if (!asset) {
            console.log(`⚠️  Préstamo ID ${loan.id}: Activo con serial ${serial} no encontrado`);
            continue;
        }

        // Determinar el estado correcto del préstamo
        // Si el activo está en ASIGNADO, el préstamo NO debería tener returnDate
        // Si el activo está en ALTA, el préstamo DEBERÍA tener returnDate

        if (asset.status === 'ASIGNADO' && loan.returnDate !== null) {
            // CASO 1: Activo asignado pero préstamo marcado como devuelto (INCONSISTENCIA)
            console.log(`🔧 Préstamo ID ${loan.id} (${loan.collaboratorName}): Activo ${serial} está ASIGNADO pero returnDate existe. Limpiando returnDate...`);

            try {
                await prisma.loan.update({
                    where: { id: loan.id },
                    data: { returnDate: null },
                });
                fixed++;
                console.log(`   ✅ Corregido\n`);
            } catch (error) {
                console.error(`   ❌ Error al corregir: ${error}\n`);
                errors++;
            }
        } else if (asset.status === 'ALTA' && loan.returnDate === null) {
            // CASO 2: Activo disponible pero préstamo no marcado como devuelto (INCONSISTENCIA)
            console.log(`🔧 Préstamo ID ${loan.id} (${loan.collaboratorName}): Activo ${serial} está en ALTA pero no tiene returnDate. Estableciendo returnDate...`);

            try {
                await prisma.loan.update({
                    where: { id: loan.id },
                    data: { returnDate: loan.endDate }, // Usar endDate como returnDate
                });
                fixed++;
                console.log(`   ✅ Corregido\n`);
            } catch (error) {
                console.error(`   ❌ Error al corregir: ${error}\n`);
                errors++;
            }
        } else {
            // Estado consistente, no hacer nada
            const status = loan.returnDate ? 'DEVUELTO' : 'ACTIVO';
            console.log(`✓  Préstamo ID ${loan.id}: Estado consistente (${status})`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Préstamos corregidos: ${fixed}`);
    console.log(`❌ Errores: ${errors}`);
    console.log(`📋 Total procesados: ${loans.length}`);
    console.log('='.repeat(60));
}

main()
    .catch((error) => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
