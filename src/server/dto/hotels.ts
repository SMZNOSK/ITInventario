// src/server/dto/hotels.ts
import { z } from "zod";

export const CreateHotelDTO = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
});

export const UpdateHotelDTO = z.object({
  name: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
});

export type CreateHotelInput = z.infer<typeof CreateHotelDTO>;
export type UpdateHotelInput = z.infer<typeof UpdateHotelDTO>;
