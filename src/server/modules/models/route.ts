// src/app/api/catalog/models/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withError } from "@/server/utils/withError";

export const GET = withError(async (req) => {
  const { searchParams } = new URL(req.url);
  const typeId = searchParams.get("typeId");
  const brandId = searchParams.get("brandId");

  const where: any = {};
  if (typeId) where.typeId = Number(typeId);
  if (brandId) where.brandId = Number(brandId);

  const items = await prisma.model.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ items });
});
