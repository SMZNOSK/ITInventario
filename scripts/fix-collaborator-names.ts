// scripts/fix-collaborator-names.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCollaboratorNames() {
    console.log('🔄 Actualizando nombres de colaboradores en asignaciones...\n');

    try {
        // Obtener todas las asignaciones con colaboradores
        const assignments = await prisma.assignment.findMany({
            include: {
                collaborator: true,
            },
        });

        console.log(`📊 Total de asignaciones encontradas: ${assignments.length}`);

        // Filtrar las que necesitan actualización (donde collaboratorName es null o igual al ID)
        const needsUpdate = assignments.filter((a) => {
            return (
                a.collaborator &&
                (!a.collaboratorName || a.collaboratorName === a.collaboratorId)
            );
        });

        console.log(`⚠️  Asignaciones que necesitan actualización: ${needsUpdate.length}\n`);

        if (needsUpdate.length === 0) {
            console.log('✅ No hay asignaciones que actualizar. Todo está correcto.');
            return;
        }

        // Actualizar cada asignación
        let updated = 0;
        for (const assignment of needsUpdate) {
            if (!assignment.collaborator) continue;

            await prisma.assignment.update({
                where: { id: assignment.id },
                data: {
                    collaboratorName: assignment.collaborator.name,
                },
            });

            updated++;
            console.log(
                `✓ Actualizado #${assignment.id}: "${assignment.collaboratorId}" -> "${assignment.collaborator.name}"`
            );
        }

        console.log(`\n✅ Actualización completada: ${updated} registros actualizados.`);
    } catch (error) {
        console.error('❌ Error al actualizar nombres de colaboradores:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar
fixCollaboratorNames()
    .then(() => {
        console.log('\n🎉 Script finalizado con éxito.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Script finalizado con errores:', error);
        process.exit(1);
    });
