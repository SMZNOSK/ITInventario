// src/app/api/assets/import/by-code/[code]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
// Cuando tengas listo el orquestador real, descomenta y ajusta el nombre:
// import { importExternalAssetByCode } from "@/server/modules/assets/orchestrator";
// Opcional auth:
// import { requireAuth, ensureRole } from "@/server/guards/auth";

type Params = { params: { code: string } };

// Handler común para GET y POST
const handler = withError(async (_req: Request, { params }: Params) => {
  const raw = params.code?.trim();

  if (!raw) {
    return NextResponse.json(
      { error: "Código requerido" },
      { status: 400 }
    );
  }

  // Aquí en el futuro vas a llamar a tu integración externa:
  //
  // const result = await importExternalAssetByCode(raw);
  // return NextResponse.json(result, { status: result.created ? 201 : 200 });
  //
  // De momento dejamos un stub controlado para que no truene.

  return NextResponse.json(
    {
      ok: false,
      code: raw,
      message:
        "Importación externa pendiente de integración (PeopleSoft / Asset API).",
    },
    { status: 501 } // Not Implemented
  );
});

// Aceptar ambos métodos para evitar 405 (GET y POST)
export const GET = handler;
export const POST = handler;
