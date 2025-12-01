// src/app/api/catalog/ram/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { Prisma } from "@prisma/client";
import {
  listRamModules,
  createRamModule,
  setRamModuleActive,
  deleteRamModule,
} from "@/server/modules/ram/service";

// GET /api/catalog/ram
export const GET = withError(async () => {
  const items = await listRamModules();
  return NextResponse.json({ items });
});

// POST /api/catalog/ram
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
      raw.label?.trim() ||
      raw.nombre_ram?.trim() ||
      "";
    vendor = raw.vendor?.trim() || raw.proveedor?.trim() || raw.fabricante?.trim();
  }

  if (!name) {
    return NextResponse.json(
      { error: "Descripción de la memoria RAM requerida" },
      { status: 400 },
    );
  }

  try {
    const id = await createRamModule(name, vendor);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe una memoria RAM con esa descripción" },
        { status: 409 },
      );
    }
    throw err;
  }
});

// PATCH /api/catalog/ram
export const PATCH = withError(async (req) => {
  const raw = await req.json().catch(() => null);
  const id = Number(raw?.id ?? 0);
  const active = Boolean(raw?.active);

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  await setRamModuleActive(id, active);
  return NextResponse.json({ ok: true });
});

// DELETE /api/catalog/ram
export const DELETE = withError(async (req) => {
  const raw = await req.json().catch(() => null);
  const id = Number(raw?.id ?? 0);

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  await deleteRamModule(id);
  return NextResponse.json({ ok: true });
});
