// src/app/api/debug/ps-test/route.ts
// Endpoint temporal para probar conexión a PeopleSoft
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const url = new URL(req.url);
    const emplId = url.searchParams.get("emplId") || "033633";

    const result: Record<string, any> = {
        timestamp: new Date().toISOString(),
        emplId,
        env: {
            PS_ENABLE: process.env.PS_ENABLE,
            PS_SOAP_HOST: process.env.PS_SOAP_HOST,
            PS_ALTA_COLAB_ENDPOINT: process.env.PS_ALTA_COLAB_ENDPOINT,
            PS_SOAP_AUTH: process.env.PS_SOAP_AUTH,
            PS_SOAP_USER: process.env.PS_SOAP_USER ? "***SET***" : "NOT_SET",
            PS_SOAP_PASS: process.env.PS_SOAP_PASS ? "***SET***" : "NOT_SET",
        },
    };

    // Si PS_ENABLE no es 1, retornar sin probar
    if (process.env.PS_ENABLE !== "1") {
        result.status = "DISABLED";
        result.message = "PS_ENABLE != 1, PeopleSoft integration is disabled";
        return NextResponse.json(result);
    }

    // Intentar conexión
    try {
        // Import dinámico para evitar errores de server-only
        const { altaColaboradorPS } = await import("@/server/integrations/collabApi");

        console.log(`[PS-TEST] Querying PeopleSoft for EMPLID: ${emplId}`);
        const { xml, json } = await altaColaboradorPS(emplId);

        result.status = "SUCCESS";
        result.responseSize = xml?.length || 0;
        result.xmlPreview = xml?.substring(0, 1000);
        result.jsonStructure = getStructure(json, 3);

    } catch (err: any) {
        result.status = "ERROR";
        result.error = err?.message || String(err);
        result.errorType = err?.code || err?.name || "Unknown";

        // Si es error de red, dar pistas
        if (err?.code === "ECONNREFUSED" || err?.code === "ETIMEDOUT") {
            result.hint = "No se puede conectar al servidor PeopleSoft. Verifica VPN/Intranet.";
        }
    }

    return NextResponse.json(result, { status: result.status === "ERROR" ? 500 : 200 });
}

// Obtener estructura del JSON para debug sin mostrar todos los datos
function getStructure(obj: any, maxDepth: number, depth = 0): any {
    if (depth > maxDepth) return "...";
    if (obj === null) return null;
    if (typeof obj !== "object") return typeof obj;
    if (Array.isArray(obj)) {
        return obj.length > 0 ? [getStructure(obj[0], maxDepth, depth + 1), `...${obj.length} items`] : [];
    }

    const result: Record<string, any> = {};
    for (const key of Object.keys(obj).slice(0, 10)) {
        result[key] = getStructure(obj[key], maxDepth, depth + 1);
    }
    return result;
}
