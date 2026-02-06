// src/app/api/ps/bienes/[emplid]/route.ts
// GET bienes asignados a un empleado desde PeopleSoft

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/guards/auth";
import { bienesPorEmpleadoPS } from "@/server/integrations/collabApi";
import { parseBienesEmpleadoResponse, filterActiveBienes } from "@/server/integrations/psBienesParser";

interface RouteParams {
    params: Promise<{ emplid: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    // 1. Auth check
    const authResult = await requireAuth(req);
    if (!authResult.ok) return authResult.res;

    // 2. Get emplid from params
    const { emplid } = await params;
    if (!emplid?.trim()) {
        return NextResponse.json(
            { error: "EMPLID requerido", code: "MISSING_EMPLID" },
            { status: 400 }
        );
    }

    // 3. Check PS is enabled
    if (process.env.PS_ENABLE !== "1") {
        return NextResponse.json(
            {
                error: "PeopleSoft está deshabilitado",
                code: "PS_DISABLED",
                hint: "Configura PS_ENABLE=1 en .env"
            },
            { status: 503 }
        );
    }

    // 4. Query PeopleSoft
    try {
        const { json, xml } = await bienesPorEmpleadoPS(emplid.trim());

        // Parse response
        const bienes = parseBienesEmpleadoResponse(json);

        // Check query param for filter
        const url = new URL(req.url);
        const activeOnly = url.searchParams.get("active") === "true";

        const result = activeOnly ? filterActiveBienes(bienes) : bienes;

        return NextResponse.json({
            emplid: emplid.trim(),
            total: result.length,
            activeCount: bienes.filter(b => b.isActive).length,
            returnedCount: bienes.filter(b => !b.isActive).length,
            bienes: result,
            rawXmlLength: xml?.length || 0,
        });
    } catch (err: any) {
        console.error("[ps/bienes] Error:", err?.message);

        // Handle specific errors
        if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
            return NextResponse.json(
                {
                    error: "Timeout al conectar con PeopleSoft",
                    code: "PS_TIMEOUT",
                    hint: "Verifica que estés conectado a la intranet"
                },
                { status: 504 }
            );
        }

        if (err?.code === "ECONNREFUSED") {
            return NextResponse.json(
                {
                    error: "Conexión rechazada por PeopleSoft",
                    code: "PS_CONNECTION_REFUSED",
                    hint: "Verifica la IP/puerto de PS"
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            {
                error: "Error al consultar PeopleSoft",
                code: "PS_ERROR",
                detail: err?.message || "Error desconocido"
            },
            { status: 500 }
        );
    }
}
