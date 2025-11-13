// src/server/modules/providers/service.ts
import "server-only";
import { prisma } from "@/lib/db";

export type ProviderRow = {
  id_proveedor: number;
  nombre: string;
  activo: boolean;
};

export async function listProviders(): Promise<ProviderRow[]> {
  return prisma.$queryRaw<ProviderRow[]>`
    SELECT
      id_proveedor,
      nombre_proveedor AS nombre,  -- 👈 columna correcta
      true             AS activo   -- 👈 no existe en la tabla, lo forzamos a true
    FROM proveedor
    ORDER BY nombre_proveedor
  `;
}

export async function createProvider(nombre: string) {
  await prisma.$executeRaw`
    INSERT INTO proveedor (nombre_proveedor)
    VALUES (${nombre})
  `;
}

export async function updateProvider(id: number, nombre: string) {
  await prisma.$executeRaw`
    UPDATE proveedor
    SET nombre_proveedor = ${nombre}
    WHERE id_proveedor = ${id}
  `;
}

export async function deleteProvider(id: number) {
  await prisma.$executeRaw`
    DELETE FROM proveedor
    WHERE id_proveedor = ${id}
  `;
}
