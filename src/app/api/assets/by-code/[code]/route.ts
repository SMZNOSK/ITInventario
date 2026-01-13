// src/app/api/assets/by-code/[code]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { prisma } from "@/lib/db";

// GET /api/assets/by-code/:code
// Busca un equipo por código (ej. RAD-000001, 1) o por serial (ej. BHUNJIMK12) en la BD local
export const GET = withError(async (req: NextRequest) => {
  // Tomamos SIEMPRE el último segmento de la URL como "code"
  const url = req.nextUrl;
  const segments = url.pathname.split("/");
  const rawCode = segments[segments.length - 1] ?? "";
  const input = decodeURIComponent(rawCode).trim();

  if (!input) {
    // Solo debería ocurrir si llaman a /api/assets/by-code/ sin nada
    return new NextResponse("Debes indicar el código o serial del equipo.", {
      status: 400,
    });
  }

  // 1) Primero intentamos BUSCAR POR SERIAL, y si existe usamos ese
  let asset = await prisma.asset.findUnique({
    where: { serial: input },
    include: { type: true },
  });

  // 2) Si no hay ningún asset con ese serial, ahora sí intentamos
  //    interpretarlo como "código" basado en id (LAP-000001, 15, etc.)
  if (!asset) {
    let assetId: number | null = null;
    const upper = input.toUpperCase();

    // Prefijo de letras + opcional guion + números: XXX-000001
    const codeMatch = upper.match(/^[A-Z]{3,}-?(\d{1,6})$/);
    if (codeMatch) {
      const num = Number.parseInt(codeMatch[1], 10);
      if (!Number.isNaN(num)) {
        assetId = num;
      }
    } else if (/^\d+$/.test(input)) {
      // Solo números → lo tomamos como id directo
      const num = Number.parseInt(input, 10);
      if (!Number.isNaN(num)) {
        assetId = num;
      }
    }

    if (assetId !== null) {
      asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { type: true },
      });
    }
  }

  if (!asset) {
    return new NextResponse("Equipo no encontrado en inventario local.", {
      status: 404,
    });
  }

  // Intentamos obtener un "código" legible:
  // - Si el modelo Asset tuviera un campo `code`, lo usamos.
  // - Si no, usamos el nombre del tipo o un fallback con el id.
  const anyAsset = asset as any;
  const assetCode: string | null =
    typeof anyAsset.code === "string" && anyAsset.code.length > 0
      ? anyAsset.code
      : asset.type?.name
      ? asset.type.name
      : `ID-${asset.id}`;

  return NextResponse.json({
    id: asset.id,
    code: assetCode, // p.ej. "LAP-000001" o "LAPTOP"
    serial: asset.serial, // p.ej. "POIUHGVBN9"
    typeId: asset.typeId,
    typeName: asset.type?.name ?? null,
  });
});
