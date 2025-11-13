// src/app/api/catalog/providers/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { listProviders, updateProvider, deleteProvider } from "@/server/modules/providers/service";
import { UpdateProviderDTO } from "@/server/dto/providers";
// Opcional:
// import { requireAuth, ensureRole } from "@/server/guards/auth";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("id requerido");
  return id;
}

function mapRow(r: any) {
  return {
    id: Number(r.id_proveedor ?? r.id ?? r.ID),
    name: String(r.nombre ?? r.name ?? ""),
    active: Boolean(r.activo ?? r.active ?? true),
  };
}

async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }
  const fd = await req.formData();
  return Object.fromEntries(Array.from(fd.entries()));
}

/** PATCH /api/catalog/providers/:id → Provider actualizado */
export const PATCH = withError(async (req, { params }: { params: { id: string } }) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const id = parseId(params.id);
  const raw = await readBody(req);
  // Acepta { name } o { nombre }
  const body = {
    name: (raw.name ?? raw.nombre ?? "").toString(),
  };

  const { name } = UpdateProviderDTO.parse(body);
  const clean = name.trim();
  if (!clean) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  await updateProvider(id, clean);

  // No tenemos un get-by-id del servicio; resolvemos con listProviders()
  const rows = await listProviders();
  const found = (rows ?? []).find((r: any) => Number(r.id_proveedor ?? r.id ?? r.ID) === id);
  const out = found ? mapRow(found) : { id, name: clean, active: true };

  return NextResponse.json(out, {
    headers: { "Cache-Control": "no-store" },
  });
});

/** DELETE /api/catalog/providers/:id → 204 No Content */
export const DELETE = withError(async (_req, { params }: { params: { id: string } }) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const id = parseId(params.id);
  await deleteProvider(id);
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
});
