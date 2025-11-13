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

// 👇 Tipo de contexto que soporta objeto o Promise (Next 16)
type BrandRouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

export const PUT = withError(
  async (req: Request, ctx: BrandRouteContext) => {
    // 👇 Desestructuramos esperando la Promise si es necesario
    const { id: rawId } = await ctx.params;
    const id = parseId(rawId);

    const body = await req.json();
    const nombre = pickBrandName(body);

    await BrandsOrchestrator.update(id, nombre);
    emit("catalogo_marcas", { tipo: "EDITADA", id });

    return NextResponse.json({ success: true });
  },
);

export const DELETE = withError(
  async (_req: Request, ctx: BrandRouteContext) => {
    // 👇 Igual aquí
    const { id: rawId } = await ctx.params;
    const id = parseId(rawId);

    await BrandsOrchestrator.remove(id);
    emit("catalogo_marcas", { tipo: "ELIMINADA", id_marca: id });

    return NextResponse.json({ success: true });
  },
);
