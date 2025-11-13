// src/server/dto/assignments.ts
import { z } from "zod";

export const AssignDTO = z.object({
  assetId: z.string().min(1),
  collaboratorId: z.string().min(1),
  assignedBy: z.string().min(1),
  startAt: z.coerce.date().optional(),
});

export type AssignInput = z.infer<typeof AssignDTO>;
