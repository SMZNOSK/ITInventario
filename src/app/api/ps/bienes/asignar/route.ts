// src/app/api/ps/bienes/asignar/route.ts
// POST - Registrar asignación de bien en PeopleSoft

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, ensureRole } from "@/server/guards/auth";
import { registrarBienPS } from "@/server/integrations/collabApi";
import { z } from "zod";

// Validation schema
const AsignarBienSchema = z.object({
    emplid: z.string().min(1, "EMPLID requerido"),
    propertyId: z.string().min(1, "Property ID requerido"),
    description: z.string().min(1, "Descripción requerida"),
    dtIssued: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD"),
    notes: z.string().optional(),
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
    let body: z.infer<typeof AsignarBienSchema>;
    try {
        const rawBody = await req.json();
        body = AsignarBienSchema.parse(rawBody);
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
        console.log("[ps/bienes/asignar] Registrando:", body.propertyId, "para", body.emplid);

        const { json, xml } = await registrarBienPS({
            emplid: body.emplid,
            propertyId: body.propertyId,
            description: body.description,
            dtIssued: body.dtIssued,
            notes: body.notes,
        });

        // TODO: Parse response to check for success/error from PS
        // For now, assume success if no exception

        return NextResponse.json({
            success: true,
            message: "Bien registrado en PeopleSoft",
            data: {
                emplid: body.emplid,
                propertyId: body.propertyId,
                dtIssued: body.dtIssued,
            },
            responseLength: xml?.length || 0,
        });
    } catch (err: any) {
        console.error("[ps/bienes/asignar] Error:", err?.message);

        return NextResponse.json(
            {
                error: "Error al registrar en PeopleSoft",
                code: "PS_ERROR",
                detail: err?.message || "Error desconocido"
            },
            { status: 500 }
        );
    }
}
