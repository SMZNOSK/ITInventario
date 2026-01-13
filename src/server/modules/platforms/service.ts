import { prisma } from "@/lib/db";
import {
  CreatePlatformDTO,
  UpdatePlatformDTO,
  CreatePlatformInput,
  UpdatePlatformInput,
} from "@/server/dto/platforms";

export async function list(params?: { q?: string | null; onlyActive?: boolean }) {
  const { q, onlyActive } = params ?? {};

  return prisma.platform.findMany({
    where: {
      AND: [
        onlyActive ? { isActive: true } : {},
        q
          ? {
              name: {
                contains: q,
                mode: "insensitive",
              },
            }
          : {},
      ],
    },
    orderBy: { name: "asc" },
  });
}

export async function get(id: number) {
  return prisma.platform.findUnique({
    where: { id },
  });
}

export async function create(input: CreatePlatformInput) {
  const data = CreatePlatformDTO.parse(input);
  return prisma.platform.create({ data });
}

export async function update(id: number, input: UpdatePlatformInput) {
  const data = UpdatePlatformDTO.parse(input);
  return prisma.platform.update({
    where: { id },
    data,
  });
}

export async function remove(id: number) {
  // Si más adelante quieres hacer "soft delete", aquí en lugar de delete() haríamos update({ isActive: false })
  return prisma.platform.delete({
    where: { id },
  });
}
