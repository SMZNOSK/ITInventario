// src/server/modules/departments/service.ts
import { prisma } from "@/lib/db";

export type DepartmentListParams = {
  q?: string;
  onlyActive?: boolean;
};

export type DepartmentPayload = {
  name: string;
  isActive?: boolean;
};

/**
 * Listado de departamentos (con búsqueda opcional y solo activos).
 */
export async function list(params?: DepartmentListParams) {
  const { q, onlyActive } = params ?? {};

  return prisma.department.findMany({
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

/**
 * Obtener un departamento por id.
 */
export async function getById(id: number) {
  return prisma.department.findUniqueOrThrow({
    where: { id },
  });
}

/**
 * Crear departamento.
 */
export async function create(payload: DepartmentPayload) {
  const name = payload.name?.trim();
  if (!name) {
    throw new Error("El nombre es obligatorio");
  }

  return prisma.department.create({
    data: {
      name,
      isActive: payload.isActive ?? true,
    },
  });
}

/**
 * Actualizar departamento.
 */
export async function update(
  id: number,
  payload: Partial<DepartmentPayload>,
) {
  const data: any = {};

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (!name) {
      throw new Error("El nombre no puede estar vacío");
    }
    data.name = name;
  }

  if (payload.isActive !== undefined) {
    data.isActive = payload.isActive;
  }

  return prisma.department.update({
    where: { id },
    data,
  });
}

/**
 * Eliminar departamento.
 */
export async function remove(id: number) {
  await prisma.department.delete({
    where: { id },
  });
}
