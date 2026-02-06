#!/usr/bin/env tsx
/**
 * Test PeopleSoft lookup directly
 */

// Setup environment first
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log("Environment loaded");
console.log("PS_ENABLE:", process.env.PS_ENABLE);
console.log("PS_SOAP_USER:", process.env.PS_SOAP_USER?.substring(0, 3) + "***");
console.log("\n========================\n");

// Now import the service
import * as collabService from '../src/server/modules/collaborators/service.js';

async function testPSLookup() {
    const emplId = "098075";

    console.log(`Testing fetchFromPeopleSoft for ${emplId}...\n`);

    try {
        const result = await collabService.fetchFromPeopleSoft(emplId);

        if (result) {
            console.log("\n✅ SUCCESS! Retrieved from PeopleSoft:");
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log("\n❌ FAILED: fetchFromPeopleSoft returned null");
            console.log("Check logs above for specific error");
        }
    } catch (error: any) {
        console.error("\n❌ ERROR calling fetchFromPeopleSoft:");
        console.error(error);
    }
}

testPSLookup().catch(console.error);
