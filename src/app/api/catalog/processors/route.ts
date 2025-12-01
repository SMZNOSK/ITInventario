// src/app/api/catalog/processors/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { Prisma } from "@prisma/client";
import {
  listProcessors,
  createProcessor,
  setProcessorActive,
  deleteProcessor,
} from "@/server/modules/processors/service";

// GET /api/catalog/processors
export const GET = withError(async () => {
  const items = await listProcessors();
  return NextResponse.json({ items });
});

// POST /api/catalog/processors
export const POST = withError(async (req) => {
  const raw = await req.json().catch(() => null);
  if (!raw) {
    return NextResponse.json({ error: "JSON requerido" }, { status: 400 });
  }

  let name = "";
  let vendor: string | undefined;

  if (typeof raw === "string") {
    name = raw.trim();
  } else {
    name =
      raw.name?.trim() ||
      raw.nombre?.trim() ||
      raw.nombre_procesador?.trim() ||
      "";
    vendor = raw.vendor?.trim() || raw.proveedor?.trim() || raw.fabricante?.trim();
  }

  if (!name) {
    return NextResponse.json(
      { error: "Nombre del procesador requerido" },
      { status: 400 },
    );
  }

  try {
    const id = await createProcessor(name, vendor);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un procesador con ese nombre" },
        { status: 409 },
      );
    }
    throw err;
  }
});

// PATCH /api/catalog/processors
export const PATCH = withError(async (req) => {
  const raw = await req.json().catch(() => null);
  const id = Number(raw?.id ?? 0);
  const active = Boolean(raw?.active);

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  await setProcessorActive(id, active);
  return NextResponse.json({ ok: true });
});

// DELETE /api/catalog/processors
export const DELETE = withError(async (req) => {
  const raw = await req.json().catch(() => null);
  const id = Number(raw?.id ?? 0);

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  await deleteProcessor(id);
  return NextResponse.json({ ok: true });
});
