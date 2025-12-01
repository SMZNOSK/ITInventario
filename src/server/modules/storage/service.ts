// src/server/modules/storage/service.ts
import "server-only";
import { prisma } from "@/lib/db";

/**
 * Lista todas las capacidades de almacenamiento registradas
 */
export async function listStorageCapacities() {
  return prisma.storageCapacity.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * Crea una nueva capacidad de almacenamiento, p.ej. "1 TB", "512 GB"
 */
export async function createStorageCapacity(name: string, vendor?: string) {
  const row = await prisma.storageCapacity.create({
    data: {
      name: name.trim(),
      vendor: vendor?.trim() || null,
      isActive: true,
    },
  });
  return row.id;
}

/**
 * Activa / desactiva una capacidad
 */
export async function setStorageCapacityActive(id: number, active: boolean) {
  await prisma.storageCapacity.update({
    where: { id: Number(id) },
    data: { isActive: !!active },
  });
}

/**
 * Borrado definitivo
 */
export async function deleteStorageCapacity(id: number) {
  await prisma.storageCapacity.delete({
    where: { id: Number(id) },
  });
}
