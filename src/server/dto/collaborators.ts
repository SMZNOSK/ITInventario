// src/server/dto/collaborators.ts
import { z } from "zod";

/**
 * EMPLID de PeopleSoft / número de colaborador.
 * Lo dejamos como string porque puede tener ceros a la izquierda.
 */
export const CollaboratorIdSchema = z
  .string()
  .trim()
  .min(1, "Debes indicar el número de colaborador");

/**
 * DTO base para un colaborador.
 * Mapea el modelo Prisma Collaborator:
 *   id, name, phone, email, jobTitle
 */
export const CollaboratorDTO = z.object({
  id: CollaboratorIdSchema,
  name: z
    .string()
    .trim()
    .min(1, "El nombre del colaborador es obligatorio"),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  email: z
    .string()
    .trim()
    .email("Correo inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  jobTitle: z
    .string()
    .trim()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type CollaboratorDTO = z.infer<typeof CollaboratorDTO>;

/**
 * Para crear/actualizar usamos el mismo shape por ahora.
 * Si después el origen es PeopleSoft, podremos ajustar aquí.
 */
export const CreateCollaboratorDTO = CollaboratorDTO;
export type CreateCollaboratorDTO = z.infer<typeof CreateCollaboratorDTO>;
