// src/server/dto/collaborators.ts
import { z } from "zod";

// Base común para creación/edición
const BaseCollaboratorDTO = z.object({
  // EMPLID / identificador de colaborador
  collabId: z.string().min(1, "EMPLID es requerido"),

  // Nombre para mostrar
  name: z.string().min(1, "Nombre es requerido"),

  // Datos de contacto opcionales
  phone: z.string().optional(),
  email: z.string().email().optional(),

  // Puesto/cargo opcional (lo usamos en la nueva pantalla)
  jobTitle: z.string().optional(),
});

// DTO original para crear
export const CreateCollaboratorDTO = BaseCollaboratorDTO;

// DTO original para actualizar (todos opcionales)
export const UpdateCollaboratorDTO = BaseCollaboratorDTO.partial();

// Tipos originales
export type CreateCollaboratorInput = z.infer<typeof CreateCollaboratorDTO>;
export type UpdateCollaboratorInput = z.infer<typeof UpdateCollaboratorDTO>;

// ===== Aliases para el código nuevo =====

// Alias usado en el nuevo service / API
export const CollaboratorDTO = CreateCollaboratorDTO;
export type CollaboratorInput = CreateCollaboratorInput;
