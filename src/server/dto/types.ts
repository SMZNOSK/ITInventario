// src/server/dto/types.ts
import { z } from "zod";

/** Acepta nombre_tipo | nombre | name y lo normaliza a { nombre } */
const NombreVariants = z.object({
  nombre_tipo: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
}).refine(v => v.nombre_tipo || v.nombre || v.name, {
  message: "nombre requerido",
}).transform(v => ({ nombre: (v.nombre_tipo ?? v.nombre ?? v.name)!.trim() }));

export const CreateTypeDTO = NombreVariants;
export const UpdateTypeDTO = NombreVariants;

export type CreateTypeInput = z.infer<typeof CreateTypeDTO>;
export type UpdateTypeInput = z.infer<typeof UpdateTypeDTO>;
