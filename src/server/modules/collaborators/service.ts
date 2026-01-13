// src/server/modules/collaborators/service.ts
import { prisma } from "@/lib/db";
import {
  CreateCollaboratorDTO,
  CollaboratorDTO,
} from "@/server/dto/collaborators";

/**
 * Normaliza el EMPLID / número de colaborador.
 */
function normalizeId(raw: string): string {
  return raw.trim();
}

/**
 * Payload básico que usaremos para asegurar/crear/actualizar un colaborador.
 */
type EnsureInput = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  jobTitle?: string | null;
};

/**
 * Normaliza la firma de argumentos para permitir:
 *  - ensureCollaborator("098075", { name: "Juan" })
 *  - ensureCollaborator({ id: "098075", name: "Juan" })
 */
function normalizeEnsureArgs(
  idOrPayload: string | EnsureInput,
  data?: Omit<EnsureInput, "id">,
): EnsureInput {
  if (typeof idOrPayload === "string") {
    return { id: idOrPayload, ...(data ?? {}) };
  }
  return idOrPayload;
}

/**
 * Asegura que exista un registro de Collaborator con ese id.
 * Si ya existe, actualiza datos básicos (nombre, teléfono, etc.),
 * si no existe, lo crea.
 *
 * Esta función es la que usa Asignaciones al crear una asignación.
 */
export async function ensureCollaborator(
  idOrPayload: string | EnsureInput,
  data?: Omit<EnsureInput, "id">,
): Promise<CollaboratorDTO> {
  const payload = normalizeEnsureArgs(idOrPayload, data);
  const id = normalizeId(payload.id);

  if (!id) {
    throw new Error("Debes indicar el número de colaborador.");
  }

  const existing = await prisma.collaborator.findUnique({
    where: { id },
  });

  const name =
    (payload.name ?? existing?.name ?? "").trim() || "SIN NOMBRE";

  const merged = {
    name,
    phone: payload.phone ?? existing?.phone ?? null,
    email: payload.email ?? existing?.email ?? null,
    jobTitle: payload.jobTitle ?? existing?.jobTitle ?? null,
  };

  if (existing) {
    const hasChanges =
      merged.name !== existing.name ||
      merged.phone !== existing.phone ||
      merged.email !== existing.email ||
      merged.jobTitle !== existing.jobTitle;

    if (!hasChanges) {
      return existing as unknown as CollaboratorDTO;
    }

    const updated = await prisma.collaborator.update({
      where: { id },
      data: merged,
    });

    return updated as unknown as CollaboratorDTO;
  }

  const created = await prisma.collaborator.create({
    data: {
      id,
      ...merged,
    },
  });

  return created as unknown as CollaboratorDTO;
}

/**
 * Listado simple de colaboradores (para futuras UIs).
 */
export async function list(): Promise<CollaboratorDTO[]> {
  const rows = await prisma.collaborator.findMany({
    orderBy: { id: "asc" },
  });

  return rows as unknown as CollaboratorDTO[];
}

/**
 * Creación directa desde el endpoint /api/collaborators.
 * Si el id ya existe, actualiza usando ensureCollaborator.
 */
export async function create(
  dto: CreateCollaboratorDTO,
): Promise<CollaboratorDTO> {
  const collaborator = await ensureCollaborator(dto.id, {
    name: dto.name,
    phone: dto.phone,
    email: dto.email,
    jobTitle: dto.jobTitle,
  });

  return collaborator;
}

/**
 * Obtener un colaborador por id (usado por /api/collaborators/[id]).
 */
export async function getById(id: string): Promise<CollaboratorDTO | null> {
  const normalized = normalizeId(id);

  if (!normalized) return null;

  const collaborator = await prisma.collaborator.findUnique({
    where: { id: normalized },
  });

  return collaborator as unknown as CollaboratorDTO | null;
}

/**
 * Pensado para integraciones externas (PeopleSoft, etc.).
 * Puedes llamarlo pasando los datos que vengan de la API externa.
 */
export async function syncFromExternal(
  payload: EnsureInput,
): Promise<CollaboratorDTO> {
  return ensureCollaborator(payload);
}

/**
 * Eliminar colaborador. Si tiene asignaciones, lanza un error entendible.
 */
export async function remove(id: string): Promise<void> {
  const normalized = normalizeId(id);
  if (!normalized) {
    throw new Error("ID de colaborador inválido.");
  }

  try {
    await prisma.collaborator.delete({
      where: { id: normalized },
    });
  } catch (err: any) {
    // Restricción de FK: colaborador con asignaciones
    if (err?.code === "P2003") {
      throw new Error(
        "No se puede eliminar el colaborador porque tiene asignaciones registradas.",
      );
    }
    throw err;
  }
}
