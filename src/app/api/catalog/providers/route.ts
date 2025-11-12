// src/app/api/catalog/providers/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { listProviders, createProvider } from "@/server/modules/providers/service";
import { CreateProviderDTO } from "@/server/dto/providers";
// Opcional:
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const GET = withError(async () => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const rows = await listProviders();
  const items = rows.map(r => ({ id: r.id_proveedor, name: r.nombre, active: r.activo }));
  return NextResponse.json({ items });
});

export const POST = withError(async (req) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const body = await req.json();
  const { name } = CreateProviderDTO.parse(body);
  await createProvider(name.trim());
  return NextResponse.json({ ok: true }, { status: 201 });
});
