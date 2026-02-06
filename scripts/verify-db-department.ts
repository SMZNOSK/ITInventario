#!/usr/bin/env tsx
/**
 * Verify that department is saved in database
 */
import { prisma } from "../src/lib/db";

async function checkDatabaseDepartment() {
    console.log("🔍 Checking if department is saved in database...\n");

    try {
        const collaborator = await prisma.collaborator.findUnique({
            where: { id: "098075" },
            select: {
                id: true,
                name: true,
                departmentName: true,
                jobTitle: true,
                email: true,
            },
        });

        if (!collaborator) {
            console.log("⚠️  Collaborator 098075 not found in database");
            return;
        }

        console.log("📊 Database record:");
        console.log(`   ID: ${collaborator.id}`);
        console.log(`   Name: ${collaborator.name}`);
        console.log(`   Department: ${collaborator.departmentName || "(NULL)"}`);
        console.log(`   Job Title: ${collaborator.jobTitle || "(NULL)"}`);
        console.log(`   Email: ${collaborator.email || "(NULL)"}`);
        console.log();

        if (collaborator.departmentName) {
            console.log(`✅ SUCCESS: Department is saved in database: "${collaborator.departmentName}"`);
        } else {
            console.log("❌ FAILED: Department field is NULL in database");
            console.log("   This means the field exists but wasn't populated from PeopleSoft");
        }

    } catch (error: any) {
        console.error("❌ Error:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkDatabaseDepartment().catch(console.error);
