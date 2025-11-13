// src/server/dto/models.ts
import { z } from "zod";

export const CreateModelDTO = z.object({
  nombre: z.string().trim().min(1),
  idTipo: z.coerce.number().int().positive(),
  idMarca: z.coerce.number().int().positive(),
});

export const UpdateModelNameDTO = z.object({
  nombre: z.string().trim().min(1),
});

export const UpdateModelEstadoDTO = z.object({
  // aceptamos "ALTA" | "BAJA" o variantes en minúsculas
  estado: z.string().trim().transform((s) => s.toUpperCase()).refine((v) => v === "ALTA" || v === "BAJA", {
    message: "estado debe ser ALTA o BAJA",
  }),
});

export const ListByQueryDTO = z.object({
  tipo: z.coerce.number().int().positive(),
  marca: z.coerce.number().int().positive(),
});

export type CreateModelInput = z.infer<typeof CreateModelDTO>;
export type UpdateModelNameInput = z.infer<typeof UpdateModelNameDTO>;
export type UpdateModelEstadoInput = z.infer<typeof UpdateModelEstadoDTO>;
export type ListByQuery = z.infer<typeof ListByQueryDTO>;
