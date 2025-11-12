// src/server/dto/disposals.ts
import { z } from "zod";

export const DisposeDTO = z.object({
  assetId: z.string().min(1),
  reason: z.string().min(1),
  evidence: z.string().url().optional(),
});

export type DisposeInput = z.infer<typeof DisposeDTO>;
