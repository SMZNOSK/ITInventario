// src/app/api/collaborators/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import {
  SyncCollaboratorSchema,
  SyncCollaboratorDTO,
} from "@/server/dto/collaborators";
import * as svc from "@/server/modules/collaborators/service";

export const runtime = "nodejs";

export const POST = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const body = (await req.json()) as unknown;
  const input: SyncCollaboratorDTO = SyncCollaboratorSchema.parse(body);

  const collaborator = await svc.syncFromExternal(input);

  return NextResponse.json({ collaborator });
});
