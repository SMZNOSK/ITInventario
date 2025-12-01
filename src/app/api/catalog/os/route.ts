// src/app/api/catalog/os/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { Prisma } from "@prisma/client";
import {
  listOperatingSystems,
  createOperatingSystem,
  setOperatingSystemActive,
  deleteOperatingSystem,
} from "@/server/modules/os/service";

// GET /api/catalog/os
export const GET = withError(async () => {
  const items = await listOperatingSystems();
  return NextResponse.json({ items });
});

// POST /api/catalog/os
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
      raw.nombre_sistema?.trim() ||
      raw.nombre_so?.trim() ||
      "";
    vendor = raw.vendor?.trim() || raw.proveedor?.trim() || raw.fabricante?.trim();
  }

  if (!name) {
    return NextResponse.json(
      { error: "Nombre del sistema operativo requerido" },
      { status: 400 },
    );
  }

  try {
    const id = await createOperatingSystem(name, vendor);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un sistema operativo con ese nombre" },
        { status: 409 },
      );
    }
    throw err;
  }
});

// PATCH /api/catalog/os  (activar / desactivar)
export const PATCH = withError(async (req) => {
  const raw = await req.json().catch(() => null);
  const id = Number(raw?.id ?? 0);
  const active = Boolean(raw?.active);

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  await setOperatingSystemActive(id, active);
  return NextResponse.json({ ok: true });
});

// DELETE /api/catalog/os  (borrado definitivo)
export const DELETE = withError(async (req) => {
  const raw = await req.json().catch(() => null);
  const id = Number(raw?.id ?? 0);

  if (!id) {
    return NextResponse.json({ error: "id requerido" }, { status: 400 });
  }

  await deleteOperatingSystem(id);
  return NextResponse.json({ ok: true });
});
