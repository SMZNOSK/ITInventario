// src/server/dto/assignments.ts
import { z } from "zod";

export const AssignDTO = z
  .object({
    // assetId puede llegar como string (serial o id) o como number (id)
    assetId: z.union([z.string().min(1, "assetId es requerido"), z.number()]),

    // EMPLID o identificador de colaborador
    collaboratorId: z.string().min(1, "collaboratorId es requerido"),

    // Nombre opcional, solo para mostrar en la UI
    collaboratorName: z.string().optional(),

    // Quién registra la asignación (id de usuario); opcional
    assignedBy: z.number().int().optional(),

    // Fecha de inicio; opcional. Aceptamos Date, string parseable, etc.
    // En el service usamos (data as any).startAt ?? new Date()
    startAt: z.union([z.coerce.date(), z.string()]).optional(),
  })
  .strict();

export type AssignInput = z.infer<typeof AssignDTO>;
