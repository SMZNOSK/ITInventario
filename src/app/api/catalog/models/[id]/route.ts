// src/app/api/catalog/models/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw http.badRequest(`id inválido: "${raw}"`);
  }
  return id;
}

/**
 * DELETE /api/catalog/models/:id
 *
 * Intenta borrar el modelo. Si está en uso por equipos, la BD
 * lanzará P2003 y devolvemos un mensaje claro.
 */
export const DELETE = withError(
  async (_req: Request, { params }: { params: { id: string } }) => {
    const id = parseId(params.id);

    try {
      await prisma.model.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        // FK violation: hay assets u otros registros que usan este modelo
        throw http.badRequest(
          "No se puede eliminar este modelo porque está asociado a uno o más equipos. " +
            "Primero desvincula esos equipos o marca el modelo como inactivo.",
        );
      }

      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        throw http.badRequest("El modelo indicado no existe.");
      }

      throw err;
    }
  },
);
