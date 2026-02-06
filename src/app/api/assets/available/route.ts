// src/app/api/assets/available/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";
import { requireAuth, getAllowedHotelIds } from "@/server/guards/auth";
import type { EquipmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = withError(async (req: NextRequest) => {
  // Autenticar usuario
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const allowedHotels = getAllowedHotelIds(auth.data);

  const url = new URL(req.url);
  const hotelIdParam = url.searchParams.get("hotelId");
  const q = (url.searchParams.get("q") ?? "").trim();

  // Construir filtro de hotel
  let hotelFilter: { currentHotelId: { in: number[] } } | undefined;
  if (hotelIdParam) {
    const hotelId = Number(hotelIdParam);
    if (!Number.isFinite(hotelId)) {
      return NextResponse.json({ error: "hotelId inválido" }, { status: 400 });
    }
    // Validar acceso al hotel
    if (allowedHotels !== null && !allowedHotels.includes(hotelId)) {
      return NextResponse.json({ error: "No tienes acceso a ese hotel" }, { status: 403 });
    }
    hotelFilter = { currentHotelId: { in: [hotelId] } };
  } else if (allowedHotels !== null) {
    // No-admin sin filtro específico: usar sus hoteles
    hotelFilter = { currentHotelId: { in: allowedHotels } };
  }

  // Equipos disponibles para usar:
  //  - Solo los que están en estado ALTA (que en la UI ves como "ACTIVO")
  //  - Filtrados por hotel si el usuario no es admin
  const where: { status: EquipmentStatus; currentHotelId?: { in: number[] }; AND?: any[] } = {
    status: "ALTA",
    ...hotelFilter,
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
    include: { type: true, brand: true, model: true, currentHotel: true },
    orderBy: { id: "asc" },
    take: 200, // límite razonable
  });

  // Formato esperado por los modales (Assignments y Loans):
  const items = assets.map((a) => ({
    id: a.id,
    code: a.serial, // Asset uses 'serial' as the code
    serial: a.serial,
    status: a.status,
    typeCode: a.type?.name ?? null, // Type uses 'name', exposed as typeCode for backwards compat
    typeName: a.type?.name ?? null,
    brandName: a.brand?.name ?? null,
    modelName: a.model?.name ?? null,
    hotelId: a.currentHotelId ?? null,
    hotelName: a.currentHotel?.name ?? null,
    type: a.type
      ? {
        code: a.type.name, // Type uses 'name'
        name: a.type.name,
      }
      : null,
    brand: a.brand ? { name: a.brand.name } : null,
    model: a.model ? { name: a.model.name } : null,
  }));

  return NextResponse.json({ items });
});
