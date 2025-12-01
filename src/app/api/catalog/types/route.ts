// src/app/api/catalog/types/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { listTipos, createTipo } from "@/server/modules/types/service";
import { CreateTypeDTO } from "@/server/dto/types";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

// Opcional auth:
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const GET = withError(async () => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

  const tipos = await listTipos();
  return NextResponse.json({ success: true, tipos });
});

export const POST = withError(async (req) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN"); if (deny) return deny;

  const raw = await req.json();
  let nombre: string;

  // 1) Soportar también string plano: "MONITOR"
  if (typeof raw === "string") {
    nombre = raw.trim();
    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "nombre requerido" },
        { status: 400 }
      );
    }
  } else {
    // 2) Usar DTO para objetos { nombre_tipo | nombre | name }
    try {
      const parsed = CreateTypeDTO.parse(raw);
      nombre = parsed.nombre;
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: "Datos inválidos para tipo",
            details: err.issues,
          },
          { status: 400 }
        );
      }
      throw err;
    }
  }

  // 3) Crear en DB y manejar duplicados
  try {
    const id = await createTipo(nombre);
    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // índice único de name violado
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un tipo con ese nombre",
          code: "TYPE_DUPLICATE",
        },
        { status: 409 }
      );
    }
    throw err;
  }
});
