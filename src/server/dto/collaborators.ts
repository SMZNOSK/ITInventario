// src/server/dto/collaborators.ts
import { z } from "zod";

export const CreateCollaboratorDTO = z.object({
  collabId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const UpdateCollaboratorDTO = CreateCollaboratorDTO.partial();

export type CreateCollaboratorInput = z.infer<typeof CreateCollaboratorDTO>;
export type UpdateCollaboratorInput = z.infer<typeof UpdateCollaboratorDTO>;
