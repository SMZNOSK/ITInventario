// src/server/modules/providers/service.ts
import "server-only";
import { prisma } from "@/lib/db";

export type ProviderRow = { id_proveedor: number; nombre: string; activo: boolean };

export async function listProviders(): Promise<ProviderRow[]> {
  return prisma.$queryRaw<ProviderRow[]>`
    SELECT id_proveedor, nombre, activo
    FROM proveedor
    ORDER BY nombre
  `;
}

export async function createProvider(nombre: string) {
  await prisma.$executeRaw`
    INSERT INTO proveedor(nombre, activo)
    VALUES (${nombre}, true)
  `;
}

export async function updateProvider(id: number, nombre: string) {
  await prisma.$executeRaw`
    UPDATE proveedor SET nombre=${nombre}
    WHERE id_proveedor=${id}
  `;
}

export async function deleteProvider(id: number) {
  await prisma.$executeRaw`
    DELETE FROM proveedor
    WHERE id_proveedor=${id}
  `;
}
