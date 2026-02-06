// src/app/api/collaborators/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as svc from "@/server/modules/collaborators/service";
// import { requireAuth, ensureRole } from "@/server/guards/auth";

type ParamsContext = {
  params: Promise<{ id: string }>;
};

export const GET = withError(async (req, context: ParamsContext) => {
  const { id } = await context.params;

  console.log(`[collaborators/GET] ========================================`);
  console.log(`[collaborators/GET] Requesting collaborator ID: ${id}`);
  console.log(`[collaborators/GET] PS_ENABLE: ${process.env.PS_ENABLE}`);

  // 1. Buscar localmente primero
  let collaborator = await svc.getById(id);
  console.log(`[collaborators/GET] Local lookup result: ${collaborator ? 'FOUND' : 'NOT FOUND'}`);

  // Variables para enriquecer con datos de PeopleSoft
  let psEnrichment: {
    departmentName?: string | null;
    hotelName?: string | null;
    hotelCode?: string | null;
  } = {};

  // 2. Si PS está habilitado, siempre intentar obtener datos adicionales de PeopleSoft
  if (process.env.PS_ENABLE === "1") {
    console.log(`[collaborators/GET] PeopleSoft is ENABLED, querying...`);
    try {
      const psData = await svc.fetchFromPeopleSoft(id);

      if (psData) {
        // Si no existe localmente, crearlo
        if (!collaborator) {
          collaborator = await svc.ensureCollaborator(id, {
            name: psData.name,
            email: psData.email,
            phone: psData.phone,
            jobTitle: psData.jobTitle || psData.departmentName,
            departmentName: psData.departmentName,
          });
        }

        // Enriquecer con datos de PS (hotel, departamento, etc.)
        psEnrichment = {
          departmentName: psData.departmentName,
          hotelName: psData.hotelName,
          hotelCode: psData.hotelCode,
        };

        return NextResponse.json({
          ...collaborator,
          ...psEnrichment,
          source: "peoplesoft"
        });
      }
    } catch (err: any) {
      console.error("[collaborators/GET] PeopleSoft error:", err);
      console.error("[collaborators/GET] Error details:", {
        message: err?.message,
        code: err?.code,
        stack: err?.stack?.split('\n').slice(0, 3).join('\n'),
      });
      // Si hay error de PS pero existe localmente, devolver datos locales
    }
  }

  // 3. Si existe localmente (sin PS o con error de PS), devolverlo
  if (collaborator) {
    return NextResponse.json({ ...collaborator, source: "local" });
  }

  return NextResponse.json(
    { error: "Colaborador no encontrado" },
    { status: 404 },
  );
});

// Actualizar datos básicos de un colaborador
export const PATCH = withError(
  async (req: Request, context: ParamsContext) => {
    const { id } = await context.params;
    const body = await req.json();

    const updated = await svc.ensureCollaborator(id, {
      name: body.name,
      email: body.email,
      phone: body.phone,
      jobTitle: body.jobTitle,
    });

    return NextResponse.json(updated);
  },
);

// Eliminar colaborador (si no tiene asignaciones)
export const DELETE = withError(
  async (req: Request, context: ParamsContext) => {
    const { id } = await context.params;

    await svc.remove(id);

    return NextResponse.json({ ok: true });
  },
);
