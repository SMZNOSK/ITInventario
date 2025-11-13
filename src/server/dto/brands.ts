// src/server/dto/brands.ts
import { z } from "zod";

export const CreateBrandDTO = z.object({
  // aceptamos "nombre_marca" (legacy) o "name"
  nombre_marca: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
}).refine((v) => (v.nombre_marca ?? v.name)?.trim(), {
  message: "nombre_marca (o name) requerido",
});

export const UpdateBrandDTO = CreateBrandDTO;

export function pickBrandName(input: unknown): string {
  const data = CreateBrandDTO.parse(input);
  return (data.nombre_marca ?? data.name)!.trim();
}
