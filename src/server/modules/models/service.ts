// src/server/modules/models/service.ts
import "server-only";
import { prisma } from "@/lib/db";

export type ModeloListItem = {
  id: number;
  nombre: string;
  tipo: string | null;
  marca: string | null;
  activo: boolean; // (status !== "BAJA")
};

export async function listModelos(): Promise<ModeloListItem[]> {
  const rows = await prisma.model.findMany({
    orderBy: { id: "desc" },
    include: { type: true, brand: true } as any,
  });

  return rows.map((r: any) => ({
    id: r.id,
    nombre: r.name,
    tipo: r.type?.name ?? null,
    marca: r.brand?.name ?? null,
    activo: (r.status ?? "ALTA").toUpperCase() !== "BAJA",
  }));
}

/** activos por tipo + marca (para selects dependientes) */
export async function listModelosActivosBy(idTipo: number, idMarca: number) {
  const items = await prisma.model.findMany({
    where: { status: "ALTA", typeId: Number(idTipo), brandId: Number(idMarca) } as any,
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return items.map((m) => ({ id_modelo: m.id, nombre_modelo: m.name }));
}

export async function createModelo(input: { nombre: string; idTipo: number; idMarca: number }) {
  const r = await prisma.model.create({
    data: {
      name: (input.nombre || "").trim(),
      status: "ALTA",
      typeId: Number(input.idTipo),
      brandId: Number(input.idMarca),
    } as any,
  });
  return r.id as number;
}

export async function updateModeloNombre(id: number, nombre: string) {
  await prisma.model.update({
    where: { id: Number(id) },
    data: { name: (nombre || "").trim() },
  });
}

export async function updateModeloEstado(id: number, estado: "ALTA" | "BAJA") {
  await prisma.model.update({
    where: { id: Number(id) },
    data: { status: estado },
  });
}

export async function deleteModelo(id: number) {
  await prisma.model.delete({ where: { id: Number(id) } });
}
