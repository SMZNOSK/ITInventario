// src/server/modules/ram/service.ts
import "server-only";
import { prisma } from "@/lib/db";

export async function listRamModules() {
  return prisma.ramModule.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createRamModule(name: string, vendor?: string) {
  const row = await prisma.ramModule.create({
    data: {
      name: name.trim(),
      vendor: vendor?.trim() || null,
      isActive: true,
    },
  });
  return row.id;
}

export async function setRamModuleActive(id: number, active: boolean) {
  await prisma.ramModule.update({
    where: { id: Number(id) },
    data: { isActive: !!active },
  });
}

export async function deleteRamModule(id: number) {
  await prisma.ramModule.delete({
    where: { id: Number(id) },
  });
}
