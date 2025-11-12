// src/app/api/catalog/brands/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { BrandsOrchestrator } from "@/server/modules/brands/orchestrator";
import { pickBrandName } from "@/server/dto/brands";
import { emit } from "@/server/utils/events";

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("id inválido");
  return id;
}

export const PUT = withError(async (req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  const body = await req.json();
  const nombre = pickBrandName(body);
  await BrandsOrchestrator.update(id, nombre);
  emit("catalogo_marcas", { tipo: "EDITADA", id });
  return NextResponse.json({ success: true });
});

export const DELETE = withError(async (_req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  await BrandsOrchestrator.remove(id);
  emit("catalogo_marcas", { tipo: "ELIMINADA", id_marca: id });
  return NextResponse.json({ success: true });
});
