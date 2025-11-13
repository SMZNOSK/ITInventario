// src/app/api/catalog/asset-status/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { EquipmentStatus } from "@prisma/client";

export const GET = withError(async () => {
  const items = Object.keys(EquipmentStatus);
  return NextResponse.json({ items });
});
