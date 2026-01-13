import { z } from "zod";

export const DepartmentDTO = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateDepartmentDTO = z.object({
  name: z.string().min(1, "Nombre requerido").max(150),
});

export const UpdateDepartmentDTO = z.object({
  name: z.string().min(1).max(150).optional(),
  isActive: z.boolean().optional(),
});

export type DepartmentDTOType = z.infer<typeof DepartmentDTO>;
export type CreateDepartmentInput = z.infer<typeof CreateDepartmentDTO>;
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentDTO>;
