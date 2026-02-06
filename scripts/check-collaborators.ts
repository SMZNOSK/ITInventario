// scripts/check-collaborators.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCollaborators() {
    console.log('🔍 Inspeccionando colaboradores en la base de datos...\n');

    try {
        const collaborators = await prisma.collaborator.findMany({
            include: {
                assignments: {
                    select: {
                        id: true,
                        status: true,
                    },
                },
            },
        });

        console.log(`📊 Total de colaboradores: ${collaborators.length}\n`);

        for (const collab of collaborators) {
            const totalAssignments = collab.assignments.length;
            const activeAssignments = collab.assignments.filter(
                (a) => a.status === 'ASIGNADO'
            ).length;

            console.log(`Colaborador ID: ${collab.id}`);
            console.log(`  Nombre: ${collab.name}`);
            console.log(`  Email: ${collab.email || 'N/A'}`);
            console.log(`  Puesto: ${collab.jobTitle || 'N/A'}`);
            console.log(`  Team Name: ${collab.teamName || 'N/A'}`);
            console.log(
                `  Asignaciones: ${totalAssignments} total, ${activeAssignments} activas`
            );

            // Detectar colaboradores con nombre igual al ID
            if (collab.name === collab.id) {
                console.log(`  ⚠️  PROBLEMA: El nombre es igual al ID`);
            }

            console.log('');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

checkCollaborators()
    .then(() => {
        console.log('✅ Inspección completada.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error:', error);
        process.exit(1);
    });
