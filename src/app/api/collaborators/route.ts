// src/app/api/collaborators/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as svc from "@/server/modules/collaborators/service";
import { CreateCollaboratorDTO, CollaboratorDTO } from "@/server/dto/collaborators";
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const GET = withError(async (req) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;

  const items = await svc.list(q ?? undefined);
  return NextResponse.json({ items });
});

export const POST = withError(async (req) => {
  // const auth = await requireAuth(req); if (!auth.ok) return auth.res;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN"); if (deny) return deny;

  const body = await req.json();

  // Puedes usar CreateCollaboratorDTO o CollaboratorDTO (son equivalentes)
  const data = CollaboratorDTO.parse(body);

  const item = await svc.create(data);
  return NextResponse.json({ collaborator: item }, { status: 201 });
});
