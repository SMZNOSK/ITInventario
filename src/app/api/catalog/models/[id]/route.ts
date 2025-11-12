// src/app/api/catalog/models/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import * as svc from "@/server/modules/models/service";
import { UpdateModelNameDTO } from "@/server/dto/models";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("id inválido");
  return id;
}

export const PATCH = withError(async (req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  const body = await req.json();
  const { nombre } = UpdateModelNameDTO.parse(body);
  await svc.updateModeloNombre(id, nombre);
  return NextResponse.json({ success: true });
});

export const DELETE = withError(async (_req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  await svc.deleteModelo(id);
  return NextResponse.json({ success: true });
});
