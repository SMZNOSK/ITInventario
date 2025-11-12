// src/app/api/catalog/hotels/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";

export const GET = withError(async (req) => {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "1";

  // Evitamos depender del nombre del campo (active vs isActive) en Prisma:
  const rows = await prisma.hotel.findMany({ orderBy: { name: "asc" } });
  const items = all ? rows : rows.filter((h: any) => (h.active ?? h.isActive ?? true));

  return NextResponse.json({ items });
});
