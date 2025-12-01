// src/server/dto/os.ts
import { z } from "zod";

/**
 * Variantes de nombre aceptadas:
 * - name
 * - nombre
 * - nombre_sistema
 * Las normalizamos a { name }
 */
const NombreBase = z.object({
  name: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(1).optional(),
  nombre_sistema: z.string().trim().min(1).optional(),
});

const VendorBase = z.object({
  vendor: z.string().trim().min(1).optional(),
});

/**
 * Create: devuelve siempre { name, vendor }
 */
export const CreateOperatingSystemDTO = NombreBase.merge(VendorBase)
  .refine((v) => v.name || v.nombre || v.nombre_sistema, {
    message: "nombre requerido",
  })
  .transform((v) => ({
    name: (v.name ?? v.nombre ?? v.nombre_sistema)!.trim(),
    vendor: v.vendor?.trim() || null,
  }));

export type CreateOperatingSystemInput = z.infer<
  typeof CreateOperatingSystemDTO
>;

/**
 * Update simple vía PATCH { id, name?, vendor?, active? }
 */
export const UpdateOperatingSystemDTO = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1).optional(),
  vendor: z.string().trim().min(1).optional(),
  active: z.boolean().optional(),
});

export type UpdateOperatingSystemInput = z.infer<
  typeof UpdateOperatingSystemDTO
>;
