// src/server/dto/ram.ts
import { z } from "zod";

export const CreateRamDTO = z.object({
  name: z.string().trim().min(1, "nombre requerido"),
  vendor: z.string().trim().min(1).optional(),
});

export const ToggleRamDTO = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
});

export type CreateRamInput = z.infer<typeof CreateRamDTO>;
export type ToggleRamInput = z.infer<typeof ToggleRamDTO>;
