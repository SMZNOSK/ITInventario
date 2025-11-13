// src/server/dto/providers.ts
import { z } from "zod";

export const CreateProviderDTO = z.object({
  name: z.string().trim().min(1, "name requerido"),
});

export const UpdateProviderDTO = z.object({
  name: z.string().trim().min(1, "name requerido"),
});

export type CreateProviderInput = z.infer<typeof CreateProviderDTO>;
export type UpdateProviderInput = z.infer<typeof UpdateProviderDTO>;
