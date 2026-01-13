// src/app/api/loans/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { z } from "zod";

const UpdateLoanSchema = z
  .object({
    collaboratorId: z.string().min(1).optional(),
    collaboratorName: z.string().nullable().optional(),
    collaboratorEmail: z.string().nullable().optional(),
    departmentName: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    teamName: z.string().min(1).optional(),
    platformId: z.number().int().positive().nullable().optional(),
    comments: z.string().nullable().optional(),
    startDate: z.string().min(1).optional(),
    endDate: z.string().min(1).optional(),
  })
  .partial();

function getIdFromRequest(req: NextRequest): number {
  const segments = req.nextUrl.pathname.split("/");
  const last = segments[segments.length - 1] ?? "";
  const id = Number.parseInt(last, 10);
  if (!Number.isFinite(id)) {
    throw new Error("ID de préstamo inválido.");
  }
  return id;
}

// GET /api/loans/:id
export const GET = withError(async (req: NextRequest) => {
  const id = getIdFromRequest(req);

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { platform: true },
  });

  if (!loan) {
    return new NextResponse("Préstamo no encontrado.", { status: 404 });
  }

  return NextResponse.json({
    id: loan.id,
    collaboratorId: loan.collaboratorId,
    collaboratorName: loan.collaboratorName,
    collaboratorEmail: loan.collaboratorEmail,
    departmentName: loan.departmentName,
    address: loan.address,
    teamName: loan.teamName,
    platformId: loan.platformId,
    platformName: loan.platform?.name ?? null,
    comments: loan.comments,
    startDate: loan.startDate,
    endDate: loan.endDate,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  });
});

// PATCH /api/loans/:id
export const PATCH = withError(async (req: NextRequest) => {
  const id = getIdFromRequest(req);
  const json = await req.json();
  const parsed = UpdateLoanSchema.parse(json);

  const data: any = { ...parsed };

  if (parsed.startDate) data.startDate = new Date(parsed.startDate);
  if (parsed.endDate) data.endDate = new Date(parsed.endDate);

  const loan = await prisma.loan.update({
    where: { id },
    data,
    include: { platform: true },
  });

  return NextResponse.json({
    id: loan.id,
    collaboratorId: loan.collaboratorId,
    collaboratorName: loan.collaboratorName,
    collaboratorEmail: loan.collaboratorEmail,
    departmentName: loan.departmentName,
    address: loan.address,
    teamName: loan.teamName,
    platformId: loan.platformId,
    platformName: loan.platform?.name ?? null,
    comments: loan.comments,
    startDate: loan.startDate,
    endDate: loan.endDate,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  });
});

// DELETE /api/loans/:id
export const DELETE = withError(async (req: NextRequest) => {
  const id = getIdFromRequest(req);

  await prisma.loan.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
});
