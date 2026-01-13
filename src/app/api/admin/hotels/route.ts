// src/app/api/admin/hotels/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { hotelsService } from "@/server/modules/hotels/service";
import { CreateHotelDTO } from "@/server/dto/hotels";
import { requireAuth, ensureRole } from "@/server/guards/auth";

// ✅ GET: Listar hoteles (solo ADMIN)
export const GET = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

  const items = await hotelsService.listAll();
  return NextResponse.json({ items });
});

// ✅ POST: Crear hotel (solo ADMIN)
export const POST = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const deny = ensureRole(auth.data, "ADMIN");
  if (deny) return deny;

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
    throw err;
  }
});
