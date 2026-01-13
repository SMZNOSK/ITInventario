// src/app/api/assignments/team-name/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { prisma } from "@/lib/db";

// PATCH /api/assignments/team-name
// Actualiza el nombre de equipo (teamName) de un colaborador
export const PATCH = withError(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);

  const collaboratorId = String(body?.collaboratorId ?? "").trim();
  const teamName = String(body?.teamName ?? "").trim();

  if (!collaboratorId || !teamName) {
    throw new Error("Colaborador y nombre de equipo son requeridos.");
  }

  // El id del colaborador en tu modelo es string, así que NO usamos parseId
  const collaborator = await prisma.collaborator.findUnique({
    where: { id: collaboratorId },
  });

  if (!collaborator) {
    throw new Error("Colaborador no encontrado.");
  }

  await prisma.collaborator.update({
    where: { id: collaboratorId },
    data: { teamName },
  });

  return NextResponse.json({ ok: true });
});
