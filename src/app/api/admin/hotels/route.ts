// src/app/api/admin/hotels/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { hotelsService } from "@/server/modules/hotels/service";
import { CreateHotelDTO } from "@/server/dto/hotels";

export const GET = withError(async () => {
  const items = await hotelsService.listAll();
  return NextResponse.json({ items });
});

export const POST = withError(async (req) => {
  const body = await req.json();
  const data = CreateHotelDTO.parse(body);
  try {
    const hotel = await hotelsService.create({ name: data.name.trim() });
    return NextResponse.json(hotel, { status: 201 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un hotel con ese nombre" },
        { status: 409 }
      );
    }
    throw err; // lo atrapará withError
  }
});
