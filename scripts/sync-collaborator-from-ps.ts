// scripts/sync-collaborator-from-ps.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncCollaboratorFromPS(collaboratorId: string) {
    console.log(`🔄 Sincronizando colaborador ${collaboratorId} desde PeopleSoft...\n`);

    try {
        // Llamar al endpoint de colaboradores que consulta PeopleSoft
        const response = await fetch(
            `http://localhost:3000/api/collaborators/${encodeURIComponent(collaboratorId)}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(`API Error: ${data.error}`);
        }

        console.log('✅ Datos obtenidos de PeopleSoft:');
        console.log(`  ID: ${data.id}`);
        console.log(`  Nombre: ${data.name || 'N/A'}`);
        console.log(`  Email: ${data.email || 'N/A'}`);
        console.log(`  Puesto: ${data.jobTitle || 'N/A'}`);
        console.log(`  Departamento: ${data.departmentName || 'N/A'}`);
        console.log(`  Hotel: ${data.hotelName || 'N/A'}`);
        console.log(`  Fuente: ${data.source || 'N/A'}`);

        console.log('\n✅ El colaborador ha sido actualizado en la base de datos.');
    } catch (error) {
        console.error('❌ Error al sincronizar colaborador:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Obtener el ID del colaborador desde argumentos de línea de comandos
const collaboratorId = process.argv[2];

if (!collaboratorId) {
    console.error('❌ Debes proporcionar el ID del colaborador como argumento.');
    console.log('Uso: npx tsx scripts/sync-collaborator-from-ps.ts <COLLABORATOR_ID>');
    process.exit(1);
}

syncCollaboratorFromPS(collaboratorId)
    .then(() => {
        console.log('\n🎉 Sincronización completada.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Error en la sincronización:', error);
        process.exit(1);
    });
