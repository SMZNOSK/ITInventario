import { z } from "zod";

export const PlatformDTO = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePlatformDTO = z.object({
  name: z.string().min(1, "Nombre requerido").max(150),
});

export const UpdatePlatformDTO = z.object({
  name: z.string().min(1).max(150).optional(),
  isActive: z.boolean().optional(),
});

export type PlatformDTOType = z.infer<typeof PlatformDTO>;
export type CreatePlatformInput = z.infer<typeof CreatePlatformDTO>;
export type UpdatePlatformInput = z.infer<typeof UpdatePlatformDTO>;
