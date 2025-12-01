// src/app/api/catalog/types/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { updateTipo, deleteTipo } from "@/server/modules/types/service";
import { UpdateTypeDTO } from "@/server/dto/types";
import { Prisma } from "@prisma/client";

/**
 * En Next 16, ctx.params puede venir como Promise<{ id: string }>
 * o como objeto directo. Lo normalizamos aquí.
 */
async function getIdFromContext(ctx: any): Promise<number> {
  const params = await Promise.resolve(ctx?.params);
  const raw = params?.id;

  const id = Number(raw);
  if (!Number.isFinite(id)) {
    throw http.badRequest(`id inválido: ${JSON.stringify(raw)}`);
  }
  return id;
}

export const PUT = withError(
  async (req: Request, ctx: any) => {
    const id = await getIdFromContext(ctx);

    const body = await req.json();
    const parsed = UpdateTypeDTO.parse(body); // { nombre }

    await updateTipo(id, parsed.nombre);

    return NextResponse.json({ success: true });
  }
);

export const DELETE = withError(
  async (_req: Request, ctx: any) => {
    const id = await getIdFromContext(ctx);

    try {
      await deleteTipo(id);
    } catch (err: any) {
      // FK: hay modelos/activos apuntando a este tipo
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        // 409: conflicto por registro en uso
        throw http.conflict(
          "No se puede eliminar este tipo porque está siendo utilizado por modelos o equipos."
        );
      }
      // Cualquier otro error, lo re-lanzamos
      throw err;
    }

    return NextResponse.json({ success: true });
  }
);
