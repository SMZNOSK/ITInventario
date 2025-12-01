// src/server/modules/os/service.ts
import "server-only";
import { prisma } from "@/lib/db";

export async function listOperatingSystems() {
  return prisma.operatingSystem.findMany({
    orderBy: { name: "asc" },
  });
}

export async function listOperatingSystemsActivos() {
  return prisma.operatingSystem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}


export async function createOperatingSystem(name: string, vendor?: string) {
  const row = await prisma.operatingSystem.create({
    data: {
      name: name.trim(),
      vendor: vendor?.trim() || null,
      isActive: true,
    },
  });
  return row.id;
}

export async function setOperatingSystemActive(id: number, active: boolean) {
  await prisma.operatingSystem.update({
    where: { id: Number(id) },
    data: { isActive: !!active },
  });
}

export async function deleteOperatingSystem(id: number) {
  await prisma.operatingSystem.delete({
    where: { id: Number(id) },
  });
}
