// src/app/api/catalog/types/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { updateTipo, deleteTipo } from "@/server/modules/types/service";
import { UpdateTypeDTO } from "@/server/dto/types";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("id inválido");
  return id;
}

export const PUT = withError(async (req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  const body = await req.json();
  const { nombre } = UpdateTypeDTO.parse(body);
  await updateTipo(id, nombre);
  return NextResponse.json({ success: true });
});

export const DELETE = withError(async (_req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  await deleteTipo(id);
  return NextResponse.json({ success: true });
});
