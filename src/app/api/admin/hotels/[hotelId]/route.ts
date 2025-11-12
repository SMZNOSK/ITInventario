// src/app/api/admin/hotels/[hotelId]/route.ts
export const runtime = "nodejs"; // importante (usa Prisma + jwt)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, ensureRole, ensureHotelAccess } from "@/server/guards/auth";

export async function GET(req: Request, { params }: { params: { hotelId: string } }) {
  // 1) auth
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;
  const user = auth.data;

  // 2) rol
  const deny = ensureRole(user, "ADMIN", "ALMACEN"); // ajusta roles
  if (deny) return deny;

  // 3) acceso por hotel
  const deny2 = ensureHotelAccess(user, params.id, "hotelId");
  if (deny2) return deny2;

  // 4) negocio
  const hotel = await prisma.hotel.findUnique({ where: { id: Number(params.id) } });
  if (!hotel) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json(hotel, { status: 200 });
}
