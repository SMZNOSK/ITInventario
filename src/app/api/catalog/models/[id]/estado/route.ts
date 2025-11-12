// src/app/api/catalog/models/[id]/estado/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import * as svc from "@/server/modules/models/service";
import { UpdateModelEstadoDTO } from "@/server/dto/models";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("id inválido");
  return id;
}

export const PATCH = withError(async (req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  const body = await req.json();
  const { estado } = UpdateModelEstadoDTO.parse(body);
  await svc.updateModeloEstado(id, estado as "ALTA" | "BAJA");
  return NextResponse.json({ success: true });
});
