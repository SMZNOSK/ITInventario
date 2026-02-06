// src/app/api/ps/debug-env/route.ts
// TEMPORARY: Diagnose env variables
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
    const user = process.env.PS_SOAP_USER || '';
    const pass = process.env.PS_SOAP_PASS || '';

    const diagnosis = {
        timestamp: new Date().toISOString(),

        // Raw values
        raw: {
            user: user,
            pass: pass,
            userType: typeof user,
            passType: typeof pass,
        },

        // Character analysis
        analysis: {
            userLength: user.length,
            passLength: pass.length,
            userCharCodes: Array.from(user).map(c => c.charCodeAt(0)),
            passCharCodes: Array.from(pass).map(c => c.charCodeAt(0)),
            userHasQuotes: user.includes('"') || user.includes("'"),
            passHasQuotes: pass.includes('"') || pass.includes("'"),
            userStartsWith: user.substring(0, 3),
            userEndsWith: user.substring(user.length - 3),
        },

        // After processing (like soapClient does)
        processed: {
            user: user.replace(/^["']|["']$/g, '').trim(),
            pass: pass.replace(/^["']|["']$/g, '').trim(),
        },

        // Base64 encoding (for Basic Auth)
        base64: {
            raw: Buffer.from(`${user}:${pass}`).toString("base64"),
            processed: Buffer.from(
                `${user.replace(/^["']|["']$/g, '').trim()}:${pass.replace(/^["']|["']$/g, '').trim()}`
            ).toString("base64"),
        }
    };

    return NextResponse.json(diagnosis, {
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    });
}
