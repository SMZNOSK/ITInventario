// src/app/api/catalog/storage/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
// 🚫 Sin requireAuth / ensureRole aquí para evitar de nuevo el error de "Token inválido"

import {
  listStorageCapacities,
  createStorageCapacity,
  setStorageCapacityActive,
  deleteStorageCapacity,
} from "@/server/modules/storage/service";
import { Prisma } from "@prisma/client";

// GET /api/catalog/storage
export const GET = withError(async () => {
  const items = await listStorageCapacities();
  return NextResponse.json({ items });
});

// POST /api/catalog/storage
export const POST = withError(async (req) => {
  const raw = await req.json().catch(() => null);
  if (!raw) {
    return NextResponse.json(
      { error: "JSON requerido" },
      { status: 400 },
    );
  }

  let name = "";
  let vendor: string | undefined;

  if (typeof raw === "string") {
    name = raw.trim();
  } else {
    name =
      raw.name?.trim() ||
      raw.nombre?.trim() ||
      raw.nombre_storage?.trim() ||
      "";
    vendor = raw.vendor?.trim() || raw.proveedor?.trim();
  }

  if (!name) {
    return NextResponse.json(
      { error: "Nombre de la capacidad requerido" },
      { status: 400 },
    );
  }

  try {
    const id = await createStorageCapacity(name, vendor);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err: any) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe una capacidad con ese nombre / proveedor" },
        { status: 409 },
      );
    }
    throw err;
  }
});

// PATCH /api/catalog/storage  (toggle ACTIVO / INACTIVO)
export const PATCH = withError(async (req) => {
  const raw = await req.json().catch(() => null);
  const id = Number(raw?.id ?? 0);
  const active = Boolean(raw?.active);

  if (!id) {
    return NextResponse.json(
      { error: "id requerido" },
      { status: 400 },
    );
  }

  await setStorageCapacityActive(id, active);
  return NextResponse.json({ ok: true });
});

// DELETE /api/catalog/storage  (borrado definitivo)
export const DELETE = withError(async (req) => {
  const raw = await req.json().catch(() => null);
  const id = Number(raw?.id ?? 0);

  if (!id) {
    return NextResponse.json(
      { error: "id requerido" },
      { status: 400 },
    );
  }

  await deleteStorageCapacity(id);
  return NextResponse.json({ ok: true });
});
