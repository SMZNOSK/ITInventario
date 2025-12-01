// src/server/dto/processors.ts
import { z } from "zod";

/**
 * Variantes de nombre aceptadas:
 * - name
 * - nombre
 * - nombre_procesador
 * Las normalizamos a { name }
 */
const NombreBase = z.object({
  name: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(1).optional(),
  nombre_procesador: z.string().trim().min(1).optional(),
});

const VendorBase = z.object({
  vendor: z.string().trim().min(1).optional(),
});

/**
 * Create: devuelve siempre { name, vendor }
 */
export const CreateProcessorDTO = NombreBase.merge(VendorBase)
  .refine((v) => v.name || v.nombre || v.nombre_procesador, {
    message: "nombre requerido",
  })
  .transform((v) => ({
    name: (v.name ?? v.nombre ?? v.nombre_procesador)!.trim(),
    vendor: v.vendor?.trim() || null,
  }));

export type CreateProcessorInput = z.infer<typeof CreateProcessorDTO>;

/**
 * Update simple vía PATCH { id, name?, vendor?, active? }
 */
export const UpdateProcessorDTO = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).optional(),
  vendor: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
});

export type UpdateProcessorInput = z.infer<typeof UpdateProcessorDTO>;
