// src/app/api/catalog/models/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as svc from "@/server/modules/models/service";
import { CreateModelDTO } from "@/server/dto/models";

// GET /api/catalog/models
export const GET = withError(async () => {
  const modelos = await svc.listModelos();

  const items = modelos.map((m) => ({
    id: m.id,
    name: m.name,
    typeId: m.typeId,
    brandId: m.brandId,
    // ya viene "ALTA" | "BAJA" desde service.ts
    status: m.status,
  }));

  return NextResponse.json({ items });
});

// POST igual que lo tienes, no hace falta tocarlo


// POST /api/catalog/models
export const POST = withError(async (req: Request) => {
  const body = await req.json();
  const data = CreateModelDTO.parse(body); // -> { nombre, idTipo, idMarca }
  const id = await svc.createModelo(data);
  return NextResponse.json({ success: true, id }, { status: 201 });
});
