// src/app/api/collaborators/sync-ps/route.ts
// Endpoint para sincronizar colaboradores desde PeopleSoft cuando estás en intranet
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { altaColaboradorPS } from "@/server/integrations/collabApi";
import { parseAltaColaboradorResponse } from "@/server/integrations/psParser";

interface SyncResult {
    emplId: string;
    status: "success" | "error" | "not_found";
    name?: string;
    error?: string;
}

export const POST = withError(async (req: Request) => {
    // Verificar que PS esté habilitado
    if (process.env.PS_ENABLE !== "1") {
        return NextResponse.json({
            success: false,
            error: "PeopleSoft está deshabilitado (PS_ENABLE != 1)",
        }, { status: 400 });
    }

    const body = await req.json();
    const emplIds: string[] = body.emplIds || [];

    if (!emplIds.length) {
        return NextResponse.json({
            success: false,
            error: "Debes proporcionar al menos un EMPLID para sincronizar",
        }, { status: 400 });
    }

    const results: SyncResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const emplId of emplIds) {
        const trimmed = emplId.trim();
        if (!trimmed) continue;

        try {
            console.log(`[sync-ps] Consultando PeopleSoft para EMPLID: ${trimmed}`);
            const { json, xml } = await altaColaboradorPS(trimmed);
            const parsed = parseAltaColaboradorResponse(json);

            if (!parsed || !parsed.name) {
                results.push({
                    emplId: trimmed,
                    status: "not_found",
                    error: "No se encontró en PeopleSoft o respuesta vacía",
                });
                continue;
            }

            // Guardar/actualizar en BD local
            await prisma.collaborator.upsert({
                where: { id: trimmed },
                create: {
                    id: trimmed,
                    name: parsed.name || "SIN NOMBRE",
                    email: parsed.email || null,
                    phone: parsed.phone || null,
                    jobTitle: parsed.jobTitle || parsed.departmentName || null,
                },
                update: {
                    name: parsed.name || undefined,
                    email: parsed.email || undefined,
                    phone: parsed.phone || undefined,
                    jobTitle: parsed.jobTitle || parsed.departmentName || undefined,
                },
            });

            results.push({
                emplId: trimmed,
                status: "success",
                name: parsed.name || undefined,
            });
            successCount++;

        } catch (err: any) {
            console.error(`[sync-ps] Error para EMPLID ${trimmed}:`, err?.message);
            results.push({
                emplId: trimmed,
                status: "error",
                error: err?.message || "Error desconocido",
            });
            errorCount++;
        }
    }

    return NextResponse.json({
        success: true,
        summary: {
            total: emplIds.length,
            success: successCount,
            errors: errorCount,
            notFound: results.filter(r => r.status === "not_found").length,
        },
        results,
    });
});

// GET: Probar conexión a PeopleSoft
export const GET = withError(async () => {
    const testResult: Record<string, any> = {
        timestamp: new Date().toISOString(),
        ps_enable: process.env.PS_ENABLE,
        ps_endpoint: process.env.PS_ALTA_COLAB_ENDPOINT,
    };

    if (process.env.PS_ENABLE !== "1") {
        testResult.status = "disabled";
        testResult.message = "PeopleSoft está deshabilitado. Cambia PS_ENABLE=1 para habilitar.";
        return NextResponse.json(testResult);
    }

    // Intentar una consulta de prueba
    try {
        const testEmplId = "000001"; // EMPLID de prueba
        console.log(`[sync-ps] Probando conexión con EMPLID de prueba: ${testEmplId}`);
        const startTime = Date.now();

        const { xml } = await altaColaboradorPS(testEmplId);

        const elapsed = Date.now() - startTime;
        testResult.status = "connected";
        testResult.responseTime = `${elapsed}ms`;
        testResult.message = "Conexión exitosa a PeopleSoft";
        testResult.responseSize = xml?.length || 0;

    } catch (err: any) {
        testResult.status = "error";
        testResult.error = err?.message || String(err);

        if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
            testResult.hint = "Timeout - El servidor no puede alcanzar PeopleSoft. Verifica que estés conectado a la intranet.";
        } else if (err?.code === "ECONNREFUSED") {
            testResult.hint = "Conexión rechazada - Verifica la IP/puerto de PeopleSoft.";
        }
    }

    return NextResponse.json(testResult);
});
