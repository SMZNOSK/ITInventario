#!/usr/bin/env tsx
/**
 * Test script: Verifies that department is saved from PeopleSoft
 */

async function testDepartmentFromPS() {
    const baseUrl = "http://localhost:3000";
    const testId = "098075"; // Known collaborator with department data

    console.log("🧪 Testing department field from PeopleSoft...\n");

    try {
        // 1. Fetch collaborator from API (should trigger PS lookup)
        console.log(`1️⃣ Fetching collaborator ${testId} from API...`);
        const response = await fetch(`${baseUrl}/api/collaborators/${testId}`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        console.log("✅ Response received:");
        console.log(`   ID: ${data.id}`);
        console.log(`   Name: ${data.name}`);
        console.log(`   Department: ${data.departmentName || "(not set)"}`);
        console.log(`   Job Title: ${data.jobTitle || "(not set)"}`);
        console.log(`   Email: ${data.email || "(not set)"}`);
        console.log(`   Source: ${data.source || "unknown"}`);
        console.log();

        // 2. Verify department field
        if (data.departmentName) {
            console.log(`✅ SUCCESS: Department field is populated: "${data.departmentName}"`);
        } else {
            console.log("⚠️  WARNING: Department field is empty");
        }

        // 3. Check if it came from PeopleSoft
        if (data.source === "peoplesoft") {
            console.log("✅ Data source confirmed: PeopleSoft");
        } else if (data.source === "local") {
            console.log("ℹ️  Data source: Local database (not PeopleSoft)");
        }

    } catch (error: any) {
        console.error("❌ Test failed:");
        console.error(`   ${error.message}`);
        process.exit(1);
    }
}

testDepartmentFromPS().catch(console.error);
