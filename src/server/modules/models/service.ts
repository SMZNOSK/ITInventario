// src/server/modules/models/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { CreateModelInput } from "@/server/dto/models";

/**
 * Soporta dos esquemas:
 *
 * 1) Esquema "nuevo" (inglés):
 *
 *    model Model {
 *      id            Int      @id @default(autoincrement())
 *      name          String
 *      typeId        Int
 *      brandId       Int
 *      isDiscontinued Boolean @default(false)
 *      createdAt     DateTime @default(now())
 *      updatedAt     DateTime @updatedAt
 *      ...
 *    }
 *
 * 2) Esquema legacy (español / Laravel):
 *
 *    model modelo {
 *      id_modelo      Int      @id @default(autoincrement())
 *      nombre_modelo  String
 *      estado         String   @default("ALTA")
 *      id_tipo_equipo Int
 *      id_marca       Int
 *      ...
 *    }
 */

const pAny = prisma as any;
const HAS_ENGLISH_MODEL = !!pAny.model;   // Prisma.model
const HAS_SPANISH_MODELO = !!pAny.modelo; // Prisma.modelo

if (!HAS_ENGLISH_MODEL && !HAS_SPANISH_MODELO) {
  throw new Error(
    "No se encontró ni `prisma.model` ni `prisma.modelo`. Revisa tu schema.prisma."
  );
}

/** Tipo unificado que el resto de la app va a usar */
export type ModeloRow = {
  id: number;
  name: string;
  typeId: number | null;
  brandId: number | null;
  /** "ALTA" = activo, "BAJA" = inactivo */
  status: "ALTA" | "BAJA";
};

/** Helper para obtener el delegate correcto según el esquema */
function delegate() {
  return HAS_ENGLISH_MODEL ? (pAny.model as any) : (pAny.modelo as any);
}

/* =========================================================
 * LISTAR
 * =======================================================*/
export async function listModelos(): Promise<ModeloRow[]> {
  const d = delegate();

  if (HAS_ENGLISH_MODEL) {
    // Tabla "Model" (inglés) con columna isDiscontinued
    const rows = await d.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        typeId: true,
        brandId: true,
        isDiscontinued: true,
      },
    });

    return (rows as any[]).map((r) => ({
      id: r.id,
      name: r.name ?? "",
      typeId: r.typeId ?? null,
      brandId: r.brandId ?? null,
      // si está descontinuado = BAJA, si no = ALTA
      status: r.isDiscontinued ? "BAJA" : "ALTA",
    }));
  }

  // Tabla legacy "modelo" (español) con columna estado
  const rows = await d.findMany({
    orderBy: { id_modelo: "desc" },
    select: {
      id_modelo: true,
      nombre_modelo: true,
      id_tipo_equipo: true,
      id_marca: true,
      estado: true,
    },
  });

  return (rows as any[]).map((r) => {
    const raw = (r.estado ?? "ALTA").toString().toUpperCase();
    const status: "ALTA" | "BAJA" = raw === "BAJA" ? "BAJA" : "ALTA";

    return {
      id: r.id_modelo,
      name: r.nombre_modelo ?? "",
      typeId: r.id_tipo_equipo ?? null,
      brandId: r.id_marca ?? null,
      status,
    };
  });
}

/* Modelos ACTIVOS por tipo + marca (para selects dependientes) */
export async function listModelosActivosBy(idTipo: number, idMarca: number) {
  const d = delegate();

  if (HAS_ENGLISH_MODEL) {
    const rows = await d.findMany({
      where: {
        isDiscontinued: false,
        typeId: Number(idTipo),
        brandId: Number(idMarca),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return (rows as any[]).map((m) => ({
      id_modelo: m.id,
      nombre_modelo: m.name ?? "",
    }));
  }

  const rows = await d.findMany({
    where: {
      estado: "ALTA",
      id_tipo_equipo: Number(idTipo),
      id_marca: Number(idMarca),
    },
    orderBy: { nombre_modelo: "asc" },
    select: { id_modelo: true, nombre_modelo: true },
  });

  return (rows as any[]).map((m) => ({
    id_modelo: m.id_modelo,
    nombre_modelo: m.nombre_modelo ?? "",
  }));
}

/* =========================================================
 * CREAR
 * =======================================================*/
export async function createModelo(input: CreateModelInput) {
  const d = delegate();
  const nombre = (input.nombre || "").trim();

  if (HAS_ENGLISH_MODEL) {
    const r = await d.create({
      data: {
        name: nombre,
        isDiscontinued: false, // siempre nace activo
        typeId: Number(input.idTipo),
        brandId: Number(input.idMarca),
      },
    });

    return (r as any).id as number;
  }

  const r = await d.create({
    data: {
      nombre_modelo: nombre,
      estado: "ALTA",
      id_tipo_equipo: Number(input.idTipo),
      id_marca: Number(input.idMarca),
    },
  });

  return (r as any).id_modelo as number;
}

/* =========================================================
 * ACTUALIZAR NOMBRE
 * =======================================================*/
export async function updateModeloNombre(id: number, nombre: string) {
  const d = delegate();
  const clean = (nombre || "").trim();

  if (HAS_ENGLISH_MODEL) {
    await d.update({
      where: { id: Number(id) },
      data: { name: clean },
    });
    return;
  }

  await d.update({
    where: { id_modelo: Number(id) },
    data: { nombre_modelo: clean },
  });
}

/* =========================================================
 * ACTUALIZAR ESTADO (ALTA / BAJA)
 * =======================================================*/
export async function updateModeloEstado(id: number, estado: "ALTA" | "BAJA") {
  const d = delegate();

  if (HAS_ENGLISH_MODEL) {
    // En el esquema nuevo, mapeamos ALTA/BAJA ⇢ isDiscontinued
    await d.update({
      where: { id: Number(id) },
      data: {
        isDiscontinued: estado === "BAJA",
      },
    });
    return;
  }

  // Esquema legacy: usamos directamente la columna estado
  await d.update({
    where: { id_modelo: Number(id) },
    data: { estado },
  });
}

/* =========================================================
 * ELIMINAR
 * =======================================================*/
export async function deleteModelo(id: number) {
  const d = delegate();

  if (HAS_ENGLISH_MODEL) {
    await d.delete({ where: { id: Number(id) } });
    return;
  }

  await d.delete({ where: { id_modelo: Number(id) } });
}
