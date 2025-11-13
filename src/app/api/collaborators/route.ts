// src/app/api/collaborators/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import * as svc from "@/server/modules/collaborators/service";
import { CreateCollaboratorDTO } from "@/server/dto/collaborators";
// import { requireAuth, ensureRole } from "@/server/guards/auth";

export const GET = withError(async () => {
  const items = await svc.list();
  return NextResponse.json({ items });
});

export const POST = withError(async (req) => {
  const body = await req.json();
  const data = CreateCollaboratorDTO.parse(body);
  const item = await svc.create(data); // hoy lanza "not implemented"
  return NextResponse.json({ collaborator: item }, { status: 201 });
});
