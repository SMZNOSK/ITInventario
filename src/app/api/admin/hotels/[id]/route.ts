// src/app/api/admin/hotels/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { hotelsService } from "@/server/modules/hotels/service";
import { UpdateHotelDTO } from "@/server/dto/hotels";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("ID inválido");
  return id;
}

export const GET = withError(async (_req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  const hotel = await hotelsService.getById(id);
  if (!hotel) throw http.notFound("Hotel no encontrado");
  return NextResponse.json(hotel);
});

export const PUT = withError(async (req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  const body = await req.json();
  const data = UpdateHotelDTO.parse(body);

  try {
    const hotel = await hotelsService.update(id, data);
    return NextResponse.json(hotel);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
    }
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un hotel con ese nombre" },
        { status: 409 }
      );
    }
    throw err;
  }
});

export const DELETE = withError(async (_req, { params }: { params: { id: string } }) => {
  const id = parseId(params.id);
  try {
    await hotelsService.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
    }
    throw err;
  }
});
