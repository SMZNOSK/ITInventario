// src/server/modules/collaborators/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type {
  CreateCollaboratorInput,
  UpdateCollaboratorInput,
  CollaboratorInput,
} from "@/server/dto/collaborators";

export type Collaborator = {
  // Campos legacy que ya usabas en el frontend
  id: string;               // EMPLID
  numColaborador: string;   // alias de id
  nombre: string;           // alias de name

  // Campos nuevos / enriquecidos
  departamento?: string;    // alias de jobTitle
  phone?: string;
  email?: string;
  jobTitle?: string;
};

function mapRow(row: any): Collaborator {
  return {
    id: row.id,
    numColaborador: row.id,
    nombre: row.name,
    departamento: row.jobTitle ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    jobTitle: row.jobTitle ?? undefined,
  };
}

/* ========= Listado ========= */

export async function list(q?: string): Promise<Collaborator[]> {
  try {
    const where =
      q && q.trim().length > 0
        ? {
            OR: [
              { id: { contains: q.trim(), mode: "insensitive" as const } },
              { name: { contains: q.trim(), mode: "insensitive" as const } },
              { email: { contains: q.trim(), mode: "insensitive" as const } },
            ],
          }
        : {};

    const rows = await prisma.collaborator.findMany({
      where,
      orderBy: { name: "asc" },
    });

    return rows.map(mapRow);
  } catch (err) {
    console.error("[collaborators:list] Error:", err);
    throw { status: 500, message: "Error al listar colaboradores" };
  }
}

/* ========= Crear (para compatibilidad) ========= */

export async function create(data: CreateCollaboratorInput): Promise<Collaborator> {
  // CreateCollaboratorInput y CollaboratorInput hoy son equivalentes,
  // así que reutilizamos la misma lógica de upsert.
  return upsert(data);
}

/* ========= Obtener uno ========= */

export async function get(id: string): Promise<Collaborator | null> {
  try {
    const row = await prisma.collaborator.findUnique({
      where: { id },
    });
    if (!row) return null;
    return mapRow(row);
  } catch (err) {
    console.error("[collaborators:get] Error:", err);
    throw { status: 500, message: "Error al obtener colaborador" };
  }
}

/* ========= Actualizar (para compatibilidad) ========= */

export async function update(
  id: string,
  data: UpdateCollaboratorInput
): Promise<Collaborator | null> {
  try {
    const existing = await prisma.collaborator.findUnique({ where: { id } });
    if (!existing) return null;

    // Evitamos cambiar el PK; ignoramos collabId si viene distinto
    const { collabId: _ignored, ...rest } = data;

    const updateData: any = {};
    if (rest.name !== undefined) updateData.name = rest.name;
    if (rest.phone !== undefined) updateData.phone = rest.phone;
    if (rest.email !== undefined) updateData.email = rest.email;
    if (rest.jobTitle !== undefined) updateData.jobTitle = rest.jobTitle;

    const row = await prisma.collaborator.update({
      where: { id },
      data: updateData,
    });

    return mapRow(row);
  } catch (err) {
    console.error("[collaborators:update] Error:", err);
    throw { status: 500, message: "Error al actualizar colaborador" };
  }
}

/* ========= Upsert (nuevo flujo principal) ========= */

export async function upsert(
  data: CollaboratorInput
): Promise<Collaborator> {
  try {
    const row = await prisma.collaborator.upsert({
      where: { id: data.collabId },
      create: {
        id: data.collabId,
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        jobTitle: data.jobTitle ?? null,
      },
      update: {
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        jobTitle: data.jobTitle ?? null,
      },
    });

    return mapRow(row);
  } catch (err) {
    console.error("[collaborators:upsert] Error:", err);
    throw { status: 500, message: "Error al guardar colaborador" };
  }
}
