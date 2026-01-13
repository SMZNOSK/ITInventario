// src/app/api/assignments/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { CreateAssignmentDTO } from "@/server/dto/assignments";
import * as svc from "@/server/modules/assignments/service";

function safeTrim(v: any): string {
  return (v ?? "").toString().trim();
}

/**
 * Acepta payloads del frontend que pueden venir como:
 * - assetId (number)
 * - assetCode (string)
 * - assetSerial / serial (string)
 *
 * En este proyecto, el "código" visible tipo LAP-000013 normalmente es Asset.serial.
 * NO existe Asset.code en Prisma, así que aquí normalizamos a assetCode = (serial o id).
 */
const CreateAssignmentRequestDTO = z
  .object({
    assetId: z
      .preprocess((v) => {
        if (v == null) return undefined;
        if (typeof v === "number") return v;
        const s = safeTrim(v);
        if (!s) return undefined;
        const n = Number(s);
        return Number.isFinite(n) ? n : undefined;
      }, z.number().int().positive().optional())
      .optional(),

    assetCode: z.any().optional(),
    assetSerial: z.any().optional(),
    serial: z.any().optional(),

    collaboratorId: z.any(),
    collaboratorName: z.any().optional(),

    departmentId: z.any().optional(),
    platformId: z.any().optional(),
    teamName: z.any().optional(),
  })
  .passthrough();

// GET /api/assignments
export const GET = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const collaboratorId = url.searchParams.get("collaboratorId");

  const items = await svc.list();

  if (collaboratorId) {
    const filtered = items.filter((item: any) => {
      const id = (item as any).collaboratorId;
      return id != null && String(id) === String(collaboratorId);
    });
    return NextResponse.json({ items: filtered });
  }

  return NextResponse.json({ items });
});

// POST /api/assignments
export const POST = withError(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const body = await req.json();
  const raw = CreateAssignmentRequestDTO.parse(body);

  const assetCode =
    safeTrim(raw.assetCode) ||
    safeTrim(raw.assetSerial) ||
    safeTrim(raw.serial) ||
    (raw.assetId != null ? String(raw.assetId) : "");

  if (!assetCode) {
    return NextResponse.json(
      {
        error: "Invalid input",
        details: { assetCode: ["Debes indicar el equipo (assetId o serial)."] },
      },
      { status: 400 },
    );
  }

  const collaboratorId = safeTrim(raw.collaboratorId);
  if (!collaboratorId) {
    return NextResponse.json(
      {
        error: "Invalid input",
        details: { collaboratorId: ["Debes indicar collaboratorId."] },
      },
      { status: 400 },
    );
  }

  const collaboratorName = safeTrim(raw.collaboratorName) || collaboratorId;

  // Validación final con el DTO canónico del módulo
  const dto = CreateAssignmentDTO.parse({
    assetCode,
    collaboratorId,
    collaboratorName,
    departmentId: raw.departmentId,
    platformId: raw.platformId,
    teamName: raw.teamName,
  });

  const assignment = await svc.create(dto);
  return NextResponse.json({ assignment }, { status: 201 });
});
