// src/app/api/ps/health/route.ts
// Healthcheck endpoint for PeopleSoft connectivity
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
    const result: Record<string, any> = {
        timestamp: new Date().toISOString(),
        ok: false,
        endpoint: process.env.PS_ALTA_COLAB_ENDPOINT || "(not configured)",
    };

    // Check if PS is enabled
    if (process.env.PS_ENABLE !== "1") {
        result.message = "PeopleSoft está deshabilitado (PS_ENABLE != 1)";
        result.hint = "Configura PS_ENABLE=1 en .env para habilitar la integración";
        return NextResponse.json(result);
    }

    // Check required env vars
    const requiredEnv = ["PS_ALTA_COLAB_ENDPOINT", "PS_ALTA_COLAB_NS"];
    const missing = requiredEnv.filter((k) => !process.env[k]);
    if (missing.length > 0) {
        result.message = `Faltan variables de entorno: ${missing.join(", ")}`;
        return NextResponse.json(result, { status: 500 });
    }

    // Try a minimal SOAP call
    try {
        const { altaColaboradorPS } = await import(
            "@/server/integrations/collabApi"
        );

        const testEmplId = "000001"; // Test EMPLID
        console.log(`[ps/health] Testing connection with EMPLID: ${testEmplId}`);

        const startTime = Date.now();
        const { xml } = await altaColaboradorPS(testEmplId);
        const elapsed = Date.now() - startTime;

        result.ok = true;
        result.message = "Conexión exitosa a PeopleSoft";
        result.responseTime = `${elapsed}ms`;
        result.responseSize = xml?.length || 0;
    } catch (err: any) {
        result.ok = false;
        result.message = "Error de conexión a PeopleSoft";
        result.error = err?.message || String(err);

        // Capturar el body de respuesta de error de axios
        if (err?.response) {
            result.httpStatus = err.response.status;
            result.httpStatusText = err.response.statusText;
            // El body puede contener el mensaje de error de PS
            const errorBody = err.response.data;
            if (typeof errorBody === "string") {
                result.psErrorResponse = errorBody.substring(0, 2000);
            } else if (errorBody) {
                result.psErrorResponse = JSON.stringify(errorBody).substring(0, 2000);
            }
        }

        if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
            result.hint =
                "Timeout - Verifica que el servidor esté conectado a la intranet";
        } else if (err?.code === "ECONNREFUSED") {
            result.hint = "Conexión rechazada - Verifica la IP/puerto de PeopleSoft";
        } else if (err?.code === "ENOTFOUND") {
            result.hint = "DNS no resuelto - Verifica el hostname de PeopleSoft";
        } else if (err?.response?.status === 401 || err?.response?.status === 403) {
            result.hint = "Error de autenticación - Verifica PS_SOAP_USER y PS_SOAP_PASS";
        } else if (err?.response?.status === 500) {
            result.hint = "Error 500 del servidor PS - Revisa psErrorResponse para más detalles";
        }
    }

    return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
