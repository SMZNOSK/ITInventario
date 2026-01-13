// src/app/api/assets/available/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import type { EquipmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = withError(async (req) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  // Equipos disponibles para usar:
  //  - Solo los que están en estado ALTA  (que en la UI ves como "ACTIVO")
  const where: { status: EquipmentStatus; AND?: any[] } = {
    status: "ALTA",
  };

  // Búsqueda opcional por tipo, marca, modelo, código o serie
  if (q) {
    const search = q.toLowerCase();

    where.AND = [
      {
        OR: [
          // Código interno del equipo (ej. LAP-000001)
          { code: { contains: search, mode: "insensitive" } },
          // Número de serie
          { serial: { contains: search, mode: "insensitive" } },
          // Tipo: código o nombre
          {
            type: {
              OR: [
                { code: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
              ],
            },
          },
          // Marca
          {
            brand: {
              name: { contains: search, mode: "insensitive" },
            },
          },
          // Modelo
          {
            model: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        ],
      },
    ];
  }

  const assets = await prisma.asset.findMany({
    where,
    include: { type: true, brand: true, model: true },
    orderBy: { id: "asc" },
    take: 200, // límite razonable
  });

  // Formato esperado por los modales (Assignments y Loans):
  const items = assets.map((a) => ({
    id: a.id,
    code: a.code,
    serial: a.serial,
    status: a.status,
    typeCode: a.type?.code ?? null,
    brandName: a.brand?.name ?? null,
    modelName: a.model?.name ?? null,
    type: a.type
      ? {
          code: a.type.code,
          name: a.type.name,
        }
      : null,
    brand: a.brand ? { name: a.brand.name } : null,
    model: a.model ? { name: a.model.name } : null,
  }));

  return NextResponse.json({ items });
});
