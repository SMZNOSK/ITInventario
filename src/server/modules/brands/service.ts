// src/server/modules/brands/service.ts
import "server-only";
import { prisma } from "@/lib/db";

export async function listMarcas() {
  return prisma.brand.findMany({ orderBy: { name: "asc" } });
}

export async function createMarca(nombre: string) {
  const r = await prisma.brand.create({ data: { name: (nombre || "").trim() } });
  return r.id as number;
}

export async function updateMarca(id: number, nombre: string) {
  await prisma.brand.update({
    where: { id: Number(id) },
    data: { name: (nombre || "").trim() },
  });
}

export async function deleteMarca(id: number) {
  await prisma.brand.delete({ where: { id: Number(id) } });
}
