// src/server/modules/disks/service.ts
import "server-only";
import { prisma } from "@/lib/db";

export async function listDiskTypes() {
  return prisma.diskType.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createDiskType(name: string, vendor?: string) {
  const row = await prisma.diskType.create({
    data: {
      name: name.trim(),
      vendor: vendor?.trim() || null,
      isActive: true,
    },
  });
  return row.id;
}

export async function setDiskTypeActive(id: number, active: boolean) {
  await prisma.diskType.update({
    where: { id: Number(id) },
    data: { isActive: !!active },
  });
}

export async function deleteDiskType(id: number) {
  await prisma.diskType.delete({
    where: { id: Number(id) },
  });
}
