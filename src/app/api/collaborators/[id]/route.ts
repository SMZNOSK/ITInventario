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

  const collaborator = await svc.getById(id);

  if (!collaborator) {
    return NextResponse.json(
      { error: "Colaborador no encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json(collaborator);
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
