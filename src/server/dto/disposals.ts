// src/server/dto/disposals.ts
import { z } from "zod";

/**
 * DTO base para crear una baja.
 *
 * - assetId puede ser:
 *   - ID numérico del Asset (ej. 1)
 *   - Serial del equipo (ej. "PROY-0001")
 * - Los demás campos son opcionales por ahora, pero ya quedan listos
 *   por si luego agregas evidencia o control más fino.
 */
export const DisposalDTO = z
  .object({
    // ID numérico o serial de texto
    assetId: z.union([z.string(), z.number()]),

    // motivo principal de la baja
    reason: z.string().min(1, "El motivo es requerido"),

    // notas adicionales opcionales
    notes: z.string().optional(),

    // evidencia opcional (PDF/foto, URL absoluta o relativa) - legacy single URL
    evidenceUrl: z.string().url().optional(),

    // evidencias múltiples (array de URLs)
    evidenceUrls: z.array(z.string()).optional(),

    // quién hizo la baja (id de usuario); opcional por ahora
    createdById: z.number().int().optional(),

    // fecha concreta; si no viene, usamos new Date()
    disposedAt: z.coerce.date().optional(),
  })
  .strict();

export type DisposalInput = z.infer<typeof DisposalDTO>;
