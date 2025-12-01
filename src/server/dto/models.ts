// src/server/dto/models.ts
import { z } from "zod";

/**
 * Acepta variantes de nombre / tipo / marca y las normaliza:
 *  - nombre_modelo | nombre | name  -> nombre
 *  - id_tipo_equipo | idTipo | typeId -> idTipo
 *  - id_marca | idMarca | brandId -> idMarca
 */
const CreateModelRaw = z.object({
  nombre_modelo: z.string().trim().min(1).optional(),
  nombre: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),

  id_tipo_equipo: z.coerce.number().int().positive().optional(),
  idTipo: z.coerce.number().int().positive().optional(),
  typeId: z.coerce.number().int().positive().optional(),

  id_marca: z.coerce.number().int().positive().optional(),
  idMarca: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
});

export const CreateModelDTO = CreateModelRaw
  .refine((v) => v.nombre_modelo || v.nombre || v.name, {
    message: "nombre requerido",
  })
  .refine((v) => v.id_tipo_equipo || v.idTipo || v.typeId, {
    message: "tipo requerido",
  })
  .refine((v) => v.id_marca || v.idMarca || v.brandId, {
    message: "marca requerida",
  })
  .transform((v) => ({
    nombre: (v.nombre_modelo ?? v.nombre ?? v.name)!.trim(),
    idTipo: Number(v.id_tipo_equipo ?? v.idTipo ?? v.typeId),
    idMarca: Number(v.id_marca ?? v.idMarca ?? v.brandId),
  }));

export type CreateModelInput = z.infer<typeof CreateModelDTO>;

/** Actualizar nombre del modelo (acepta name o nombre) */
export const UpdateModelNameDTO = z
  .object({
    nombre_modelo: z.string().trim().min(1).optional(),
    nombre: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
  })
  .refine((v) => v.nombre_modelo || v.nombre || v.name, {
    message: "nombre requerido",
  })
  .transform((v) => ({
    nombre: (v.nombre_modelo ?? v.nombre ?? v.name)!.trim(),
  }));

export type UpdateModelNameInput = z.infer<typeof UpdateModelNameDTO>;

/** Actualizar estado ALTA/BAJA (acepta estado o status) */
export const UpdateModelEstadoDTO = z
  .object({
    estado: z.string().trim().optional(),
    status: z.string().trim().optional(),
  })
  .refine((v) => v.estado || v.status, {
    message: "estado requerido",
  })
  .transform((v) => {
    const raw = (v.estado ?? v.status ?? "").toUpperCase();
    if (raw !== "ALTA" && raw !== "BAJA") {
      throw new Error("estado debe ser ALTA o BAJA");
    }
    return { estado: raw as "ALTA" | "BAJA" };
  });

export type UpdateModelEstadoInput = z.infer<typeof UpdateModelEstadoDTO>;

/** Filtro para /by?tipo=..&marca=.. (por si lo usas luego) */
export const ListByQueryDTO = z.object({
  tipo: z.coerce.number().int().positive(),
  marca: z.coerce.number().int().positive(),
});

export type ListByQuery = z.infer<typeof ListByQueryDTO>;
