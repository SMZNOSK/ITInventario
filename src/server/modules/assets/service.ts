// src/server/modules/assets/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { CreateAssetInput, UpdateAssetInput } from "@/server/dto/assets";

export function create(data: CreateAssetInput) {
  return prisma.asset.create({ data });
}
export function list() {
  return prisma.asset.findMany({ orderBy: { createdAt: "desc" } });
}
export function get(id: string) {
  return prisma.asset.findUnique({ where: { id } });
}
export function update(id: string, data: UpdateAssetInput) {
  return prisma.asset.update({ where: { id }, data });
}
