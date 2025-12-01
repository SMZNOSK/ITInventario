// src/server/dto/disks.ts
import { z } from "zod";

export const CreateDiskDTO = z.object({
  name: z.string().trim().min(1, "nombre requerido"),
  vendor: z.string().trim().min(1).optional(),
});

export type CreateDiskInput = z.infer<typeof CreateDiskDTO>;

export const UpdateDiskDTO = z.object({
  id: z.number().int().positive(),
  active: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  vendor: z.string().trim().min(1).optional(),
});

export type UpdateDiskInput = z.infer<typeof UpdateDiskDTO>;
