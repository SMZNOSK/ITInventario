// src/app/api/collaborators/lookup/route.ts
// Lookup collaborator by code query param - more convenient than path param
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as svc from "@/server/modules/collaborators/service";

export const GET = withError(async (req: NextRequest) => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code")?.trim();

    if (!code) {
        return NextResponse.json(
            { error: "Parámetro 'code' es requerido", code: "MISSING_CODE" },
            { status: 400 }
        );
    }

    // 1. Try local database first
    let collaborator = await svc.getById(code);

    if (collaborator) {
        return NextResponse.json({
            code: collaborator.id,
            name: collaborator.name,
            email: collaborator.email,
            phone: collaborator.phone,
            jobTitle: collaborator.jobTitle,
            department: collaborator.jobTitle, // alias for UI
            source: "local",
        });
    }

    // 2. Try PeopleSoft if enabled
    if (process.env.PS_ENABLE === "1") {
        try {
            const psData = await svc.fetchFromPeopleSoft(code);

            if (psData && psData.name) {
                // Save to local DB for future lookups
                collaborator = await svc.ensureCollaborator(code, {
                    name: psData.name,
                    email: psData.email,
                    phone: psData.phone,
                    jobTitle: psData.jobTitle || psData.departmentName,
                });

                return NextResponse.json({
                    code: collaborator.id,
                    name: collaborator.name,
                    email: collaborator.email || psData.email,
                    phone: collaborator.phone || psData.phone,
                    jobTitle: collaborator.jobTitle || psData.jobTitle,
                    department: psData.departmentName || psData.jobTitle,
                    source: "peoplesoft",
                });
            }

            // PS returned empty/null
            return NextResponse.json(
                {
                    error: "Colaborador no encontrado en PeopleSoft",
                    code: "NOT_FOUND_PS",
                    psEnabled: true,
                },
                { status: 404 }
            );

        } catch (err: any) {
            console.error("[collaborators/lookup] PeopleSoft error:", err?.message);

            // Return PS error but suggest manual capture
            return NextResponse.json(
                {
                    error: "Error al consultar PeopleSoft",
                    code: "PS_ERROR",
                    detail: err?.message || "Error desconocido",
                    hint: "Puedes capturar los datos manualmente",
                    psEnabled: true,
                },
                { status: 503 }
            );
        }
    }

    // PS is disabled and not found locally
    return NextResponse.json(
        {
            error: "Colaborador no encontrado",
            code: "NOT_FOUND",
            psEnabled: false,
            hint: "PeopleSoft está deshabilitado. Puedes capturar los datos manualmente.",
        },
        { status: 404 }
    );
});
