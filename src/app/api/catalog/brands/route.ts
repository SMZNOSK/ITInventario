// src/app/api/catalog/brands/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { BrandsOrchestrator } from "@/server/modules/brands/orchestrator";
import { pickBrandName } from "@/server/dto/brands";
import { emit } from "@/server/utils/events";
import { prisma } from "@/lib/db";

export const GET = withError(async (req) => {
  const { searchParams } = new URL(req.url);
  const typeIdRaw = searchParams.get("typeId");

  if (typeIdRaw !== null) {
    const typeId = Number(typeIdRaw);
    if (!Number.isFinite(typeId)) {
      return NextResponse.json({ error: "typeId inválido" }, { status: 400 });
    }
    const marcas = await prisma.brand.findMany({
      where: { typeId },
      orderBy: { name: "asc" },
    });
    // 👇 Conserva tu shape actual
    return NextResponse.json({ success: true, marcas });
  }

  // Sin filtro: lo de siempre, vía orquestador
  const marcas = await BrandsOrchestrator.list();
  return NextResponse.json({ success: true, marcas });
});

export const POST = withError(async (req) => {
  const body = await req.json();
  const nombre = pickBrandName(body); // acepta nombre_marca o name
  const id = await BrandsOrchestrator.create(nombre);
  emit("catalogo_marcas", { tipo: "CREADA", id });
  return NextResponse.json({ success: true, id });
});
