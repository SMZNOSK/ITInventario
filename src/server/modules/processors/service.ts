// src/server/modules/processors/service.ts
import "server-only";
import { prisma } from "@/lib/db";

export async function listProcessors() {
  return prisma.processor.findMany({
    orderBy: { name: "asc" },
  });
}

export async function listProcessorsActivos() {
  return prisma.processor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}


export async function createProcessor(name: string, vendor?: string) {
  const row = await prisma.processor.create({
    data: {
      name: name.trim(),
      vendor: vendor?.trim() || null,
      isActive: true,
    },
  });
  return row.id;
}

export async function setProcessorActive(id: number, active: boolean) {
  await prisma.processor.update({
    where: { id: Number(id) },
    data: { isActive: !!active },
  });
}

export async function deleteProcessor(id: number) {
  await prisma.processor.delete({
    where: { id: Number(id) },
  });
}
