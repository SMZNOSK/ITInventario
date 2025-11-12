 // src/app/api/catalog/providers/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { updateProvider, deleteProvider } from "@/server/modules/providers/service";
import { UpdateProviderDTO } from "@/server/dto/providers";
// Opcional:
// import { requireAuth, ensureRole } from "@/server/guards/auth";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id)) throw http.badRequest("id requerido");
  return id;
}

export const PATCH = withError(async (req, { params }: { params: { id: string } }) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const id = parseId(params.id);
  const body = await req.json();
  const { name } = UpdateProviderDTO.parse(body);
  await updateProvider(id, name.trim());
  return NextResponse.json({ ok: true });
});

export const DELETE = withError(async (_req, { params }: { params: { id: string } }) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const id = parseId(params.id);
  await deleteProvider(id);
  return NextResponse.json({ ok: true });
});
