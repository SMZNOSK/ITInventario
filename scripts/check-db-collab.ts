#!/usr/bin/env tsx
/**
 * Debug script: Check if collaborator exists in database
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkCollaboratorInDB() {
    try {
        console.log("🔍 Checking if collaborator 098075 exists in database...\n");

        const collab = await prisma.collaborator.findUnique({
            where: { id: "098075" }
        });

        if (collab) {
            console.log("✅ Collaborator EXISTS in database:");
            console.log(`   ID: ${collab.id}`);
            console.log(`   Name: ${collab.name}`);
            console.log(`   Department: ${collab.departmentName || "(NULL)"}`);
            console.log(`   Email: ${collab.email || "(NULL)"}`);
        } else {
            console.log("❌ Collaborator NOT FOUND in database");
            console.log("   This is why the API returns 404 if PeopleSoft also fails");
        }
    } catch (error: any) {
        console.error("Error:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkCollaboratorInDB();
