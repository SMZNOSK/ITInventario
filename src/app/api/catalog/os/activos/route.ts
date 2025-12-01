// src/app/api/catalog/os/activos/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as svc from "@/server/modules/os/service";

/**
 * GET /api/catalog/os/activos
 * Devuelve solo los sistemas operativos activos,
 * pensado para combos/selects en formularios.
 */
export const GET = withError(async () => {
  // Obtenemos todos los SO y filtramos por isActive
  const all = await svc.listOperatingSystems();
  const items = Array.isArray(all)
    ? all.filter((os: any) => os.isActive !== false)
    : [];

  return NextResponse.json({ items });
});
