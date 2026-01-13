// src/app/api/assignments/manual/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import {
  getManual,
  updateManual,
  removeManual,
} from "@/server/modules/assignments/service";
import { z } from "zod";

export const dynamic = "force-dynamic";

/* ========= Helpers ========= */

async function parseId(ctx: any): Promise<number> {
  // Next 16: ctx.params puede venir como Promise
  const params = (await ctx?.params) ?? ctx?.params ?? {};
  const raw = (params as any)?.id;

  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error("ID inválido");
  return n;
}

const PatchSchema = z
  .object({
    status: z.string().optional(),
    markReturned: z.boolean().optional(),

    department: z.string().nullable().optional(),
    direction: z.string().nullable().optional(),
    teamName: z.string().nullable().optional(),

    hotel: z.string().nullable().optional(),
    hotelName: z.string().nullable().optional(),
    hotelLabel: z.string().nullable().optional(),

    platformId: z.union([z.number(), z.string()]).nullable().optional(),
    platformName: z.string().nullable().optional(),
    platform: z.string().nullable().optional(),
    platformLabel: z.string().nullable().optional(),

    description: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .strict();

/* ========= Handlers ========= */

export const GET = withError(async (req: NextRequest, ctx: any) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const id = await parseId(ctx);
  const item = await getManual(id);
  return NextResponse.json({ item });
});

export const PATCH = withError(async (req: NextRequest, ctx: any) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const id = await parseId(ctx);
  const body = await req.json().catch(() => ({}));
  const input = PatchSchema.parse(body);

  const item = await updateManual(id, input);
  return NextResponse.json({ item });
});

export const DELETE = withError(async (req: NextRequest, ctx: any) => {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.res;

  const id = await parseId(ctx);
  const result = await removeManual(id);
  return NextResponse.json(result);
});
