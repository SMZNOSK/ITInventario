// src/app/api/catalog/providers/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { listProviders, createProvider } from "@/server/modules/providers/service";
import { CreateProviderDTO } from "@/server/dto/providers";
// Opcional:
// import { requireAuth, ensureRole } from "@/server/guards/auth";

/** Normaliza fila del servicio a shape público */
function mapRow(r: any) {
  return {
    id: Number(r.id_proveedor ?? r.id ?? r.ID),
    name: String(r.nombre ?? r.name ?? ""),
    active: Boolean(r.activo ?? r.active ?? true),
  };
}

/** Permite JSON o FormData */
async function readBody(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return (await req.json().catch(() => ({}))) as Record<string, unknown>;
  }
  const fd = await req.formData();
  return Object.fromEntries(Array.from(fd.entries()));
}

function normalizeName(s: string) {
  return s.trim().toLowerCase();
}

export const GET = withError(async (_req?: Request) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const raw = await listProviders();

  // Soportar varias formas de respuesta del servicio
  let rows: any[] = [];
  if (Array.isArray(raw)) {
    rows = raw;
  } else if (raw && Array.isArray((raw as any).rows)) {
    rows = (raw as any).rows;
  } else if (raw && Array.isArray((raw as any).items)) {
    rows = (raw as any).items;
  }

  const items = rows.map(mapRow);

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "no-store" } },
  );
});

export const POST = withError(async (req: Request) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const raw = await readBody(req);
  const body = { name: String(raw.name ?? raw.nombre ?? "") };

  const { name } = CreateProviderDTO.parse(body);
  const clean = name.trim();
  if (!clean) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  // El servicio devuelve void: solo creamos y luego consultamos para regresar el objeto.
  await createProvider(clean);

  // Buscar el recién creado (por nombre). Si hay varios con el mismo nombre, toma el de mayor id.
  const rawAfter = await listProviders();

  let rowsAfter: any[] = [];
  if (Array.isArray(rawAfter)) {
    rowsAfter = rawAfter;
  } else if (rawAfter && Array.isArray((rawAfter as any).rows)) {
    rowsAfter = (rawAfter as any).rows;
  } else if (rawAfter && Array.isArray((rawAfter as any).items)) {
    rowsAfter = (rawAfter as any).items;
  }

  const candidates = rowsAfter
    .map(mapRow)
    .filter((p) => normalizeName(p.name) === normalizeName(clean))
    .sort((a, b) => a.id - b.id);

  const out = candidates.length
    ? candidates[candidates.length - 1]
    : { id: 0, name: clean, active: true };

  return NextResponse.json(out, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
});
