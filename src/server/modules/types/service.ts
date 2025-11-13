// src/server/modules/types/service.ts
import "server-only";
import { prisma } from "@/lib/db";

/** Lista completa, ordenada */
export async function listTipos() {
  return prisma.type.findMany({ orderBy: { name: "asc" } });
}

/** Activos: si el modelo tiene status, filtra status !== 'BAJA'; si no, devuelve todos */
export async function listTiposActivos() {
  const rows = await prisma.type.findMany({ orderBy: { name: "asc" } }) as any[];
  // Si no existe `status` en tu modelo, esta línea conservará todos
  return rows.filter(r => (r.status ?? "ALTA").toUpperCase() !== "BAJA");
}

export async function createTipo(nombre: string) {
  const r = await prisma.type.create({ data: { name: (nombre || "").trim() } });
  return r.id;
}

export async function updateTipo(id: number, nombre: string) {
  await prisma.type.update({
    where: { id: Number(id) },
    data: { name: (nombre || "").trim() },
  });
}

export async function deleteTipo(id: number) {
  await prisma.type.delete({ where: { id: Number(id) } });
}
