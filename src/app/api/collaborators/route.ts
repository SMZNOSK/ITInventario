// src/app/api/collaborators/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as svc from "@/server/modules/collaborators/service";
import { CreateCollaboratorDTO } from "@/server/dto/collaborators";
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const GET = withError(async (req: NextRequest) => {
  // const auth = await requireAuth();
  // if (auth.error) return auth.error;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN");
  // if (deny) return deny;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const items = await svc.list({ q });

  return NextResponse.json({ items });
});

export const POST = withError(async (req: NextRequest) => {
  // const auth = await requireAuth();
  // if (auth.error) return auth.error;
  // const deny = ensureRole(auth.data, "ADMIN", "ALMACEN");
  // if (deny) return deny;

  const body = await req.json();
  const dto = CreateCollaboratorDTO.parse(body);

  const collaborator = await svc.create(dto);

  return NextResponse.json({ collaborator });
});
