// scripts/create-collaborator-manually.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Crea o actualiza un colaborador manualmente en la base de datos local
 * Útil cuando PeopleSoft no está disponible o no tiene datos
 */
async function createCollaboratorManually() {
    const collaboratorId = process.argv[2];
    const collaboratorName = process.argv[3];

    if (!collaboratorId) {
        console.error('❌ Debes proporcionar el ID del colaborador.');
        console.log('Uso: npx tsx scripts/create-collaborator-manually.ts <ID> "<NOMBRE COMPLETO>"');
        console.log('Ejemplo: npx tsx scripts/create-collaborator-manually.ts 098075 "DANIEL CARRANZA"');
        process.exit(1);
    }

    if (!collaboratorName) {
        console.error('❌ Debes proporcionar el nombre del colaborador.');
        console.log('Uso: npx tsx scripts/create-collaborator-manually.ts <ID> "<NOMBRE COMPLETO>"');
        console.log('Ejemplo: npx tsx scripts/create-collaborator-manually.ts 098075 "DANIEL CARRANZA"');
        process.exit(1);
    }

    try {
        console.log(`🔄 Creando/actualizando colaborador: ${collaboratorId}`);

        const collaborator = await prisma.collaborator.upsert({
            where: { id: collaboratorId },
            update: {
                name: collaboratorName,
            },
            create: {
                id: collaboratorId,
                name: collaboratorName,
            },
        });

        console.log('\n✅ Colaborador guardado exitosamente:');
        console.log(`   ID: ${collaborator.id}`);
        console.log(`   Nombre: ${collaborator.name}`);
        console.log(`   Email: ${collaborator.email || 'N/A'}`);
        console.log(`   Puesto: ${collaborator.jobTitle || 'N/A'}`);

        // Ahora actualizar las asignaciones que tengan este colaborador
        const updatedAssignments = await prisma.assignment.updateMany({
            where: {
                collaboratorId: collaboratorId,
            },
            data: {
                collaboratorName: collaboratorName,
            },
        });

        console.log(`\n✅ Actualizadas ${updatedAssignments.count} asignaciones con el nuevo nombre.`);
    } catch (error) {
        console.error('❌ Error al crear colaborador:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

createCollaboratorManually()
    .then(() => {
        console.log('\n🎉 Proceso completado.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error:', error);
        process.exit(1);
    });
