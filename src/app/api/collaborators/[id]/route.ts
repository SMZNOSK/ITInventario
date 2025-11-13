// src/app/api/collaborators/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import * as svc from "@/server/modules/collaborators/service";
import { UpdateCollaboratorDTO } from "@/server/dto/collaborators";

export const GET = withError(async (_req, { params }: { params: { id: string } }) => {
  const item = await svc.get(params.id);
  if (!item) throw http.notFound("Not found");
  return NextResponse.json({ collaborator: item });
});

export const PATCH = withError(async (req, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const data = UpdateCollaboratorDTO.parse(body);
  const item = await svc.update(params.id, data);
  if (!item) throw http.notFound("Not found");
  return NextResponse.json({ collaborator: item });
});
