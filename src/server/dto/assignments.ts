// src/server/dto/assignments.ts
import { z } from "zod";

/* ========= Helpers ========= */

const reqStr = (min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(min).max(max),
  );

const optStr = (max: number) =>
  z.preprocess((v) => {
    if (v == null) return undefined;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" ? undefined : t;
  }, z.string().max(max).optional());

const optEmail = () =>
  z.preprocess((v) => {
    if (v == null) return undefined;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t === "" ? undefined : t;
  }, z.string().email("Correo inválido").optional());

const optInt = () =>
  z.preprocess((v) => {
    if (v == null) return undefined;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const t = v.trim();
      if (t === "") return undefined;
      const n = Number(t);
      return Number.isFinite(n) ? n : v;
    }
    return v;
  }, z.number().int().positive().optional());

const optIntOrNull = () =>
  z.preprocess((v) => {
    if (v === null) return null;
    if (v == null) return undefined;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const t = v.trim();
      if (t === "") return undefined;
      if (t.toLowerCase() === "null") return null;
      const n = Number(t);
      return Number.isFinite(n) ? n : v;
    }
    return v;
  }, z.union([z.number().int().positive(), z.null()]).optional());

/* ========= Asignación normal (con número) ========= */
/**
 * ✅ Robustez:
 * - Permitimos crear por assetId (ideal)
 * - o por assetCode/assetSerial (cuando el modal no trae id)
 * - collaboratorName opcional (fallback en API/service)
 */
export const CreateAssignmentDTO = z
  .object({
    assetId: optInt(), // puede venir, o no

    // alias para resolver el asset cuando assetId no viene
    assetCode: optStr(80), // ej "LAP-000013" (derivado, NO existe en DB)
    assetSerial: optStr(80), // serial real

    collaboratorId: reqStr(1, 20),
    collaboratorName: optStr(160),

    departmentId: optIntOrNull(),
    platformId: optIntOrNull(),
    teamName: optStr(120),
  })
  .superRefine((v, ctx) => {
    const hasAnyAsset =
      v.assetId != null || !!v.assetCode || !!v.assetSerial;
    if (!hasAnyAsset) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assetId"],
        message: "Debes enviar assetId o assetCode o assetSerial.",
      });
    }
  });

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentDTO>;

export const UpdateAssignmentDTO = z.object({
  departmentId: optIntOrNull(),
  platformId: optIntOrNull(),
});

export type UpdateAssignmentInput = z.infer<typeof UpdateAssignmentDTO>;

/* ========= Asignación MANUAL (sin número) ========= */

export const CreateManualAssignmentDTO = z.object({
  assetCode: reqStr(1, 80),

  collaboratorName: reqStr(3, 160),
  collaboratorEmail: optEmail(),

  direction: optStr(200),
  department: optStr(120),

  hotel: optStr(120),
  hotelName: optStr(120),
  hotelLabel: optStr(120),

  teamName: optStr(120),

  platformId: optInt(),
  platformName: optStr(120),
  platform: optStr(120),
  platformLabel: optStr(120),

  description: optStr(500),
});

export type CreateManualAssignmentInput = z.infer<
  typeof CreateManualAssignmentDTO
>;
