// src/server/dto/assets.ts
import { z } from "zod";

export const CreateAssetDTO = z.object({
  assetCode: z.string().min(1),
  kind: z.string().min(1),
  model: z.string().optional(),
  serial: z.string().optional(),
  purchasedAt: z.coerce.date().optional(),
});

export const UpdateAssetDTO = CreateAssetDTO.partial();

export type CreateAssetInput = z.infer<typeof CreateAssetDTO>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetDTO>;
