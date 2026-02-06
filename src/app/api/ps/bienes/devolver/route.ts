// src/app/api/ps/bienes/devolver/route.ts
// POST - Registrar devolución de bien en PeopleSoft

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, ensureRole } from "@/server/guards/auth";
import { devolverBienPS } from "@/server/integrations/collabApi";
import { z } from "zod";

// Validation schema
const DevolverBienSchema = z.object({
    emplid: z.string().min(1, "EMPLID requerido"),
    propertyId: z.string().min(1, "Property ID requerido"),
    dtReturned: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD"),
});

export async function POST(req: NextRequest) {
    // 1. Auth check - require ADMIN, ALMACEN, or INGENIERO
    const authResult = await requireAuth(req);
    if (!authResult.ok) return authResult.res;

    const roleCheck = ensureRole(authResult.data, "ADMIN", "ALMACEN", "INGENIERO");
    if (roleCheck) return roleCheck;

    // 2. Check PS is enabled
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

    // 3. Parse and validate body
    let body: z.infer<typeof DevolverBienSchema>;
    try {
        const rawBody = await req.json();
        body = DevolverBienSchema.parse(rawBody);
    } catch (err: any) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: "Datos inválidos",
                    code: "VALIDATION_ERROR",
                    details: err.issues
                },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Error al parsear JSON", code: "PARSE_ERROR" },
            { status: 400 }
        );
    }

    // 4. Call PeopleSoft
    try {
        console.log("[ps/bienes/devolver] Devolviendo:", body.propertyId, "de", body.emplid);

        const { json, xml } = await devolverBienPS({
            emplid: body.emplid,
            propertyId: body.propertyId,
            dtReturned: body.dtReturned,
        });

        // TODO: Parse response to check for success/error from PS
        // For now, assume success if no exception

        return NextResponse.json({
            success: true,
            message: "Devolución registrada en PeopleSoft",
            data: {
                emplid: body.emplid,
                propertyId: body.propertyId,
                dtReturned: body.dtReturned,
            },
            responseLength: xml?.length || 0,
        });
    } catch (err: any) {
        console.error("[ps/bienes/devolver] Error:", err?.message);

        return NextResponse.json(
            {
                error: "Error al registrar devolución en PeopleSoft",
                code: "PS_ERROR",
                detail: err?.message || "Error desconocido"
            },
            { status: 500 }
        );
    }
}
