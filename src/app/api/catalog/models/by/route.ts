// src/app/api/catalog/models/by/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import * as svc from "@/server/modules/models/service";
import { ListByQueryDTO } from "@/server/dto/models";

export const GET = withError(async (req) => {
  const { searchParams } = new URL(req.url);
  const parsed = ListByQueryDTO.safeParse({
    tipo: searchParams.get("tipo"),
    marca: searchParams.get("marca"),
  });
  if (!parsed.success) throw http.badRequest("tipo y marca son requeridos");

  const { tipo, marca } = parsed.data;
  const items = await svc.listModelosActivosBy(tipo, marca);
  return NextResponse.json({ success: true, items });
});

