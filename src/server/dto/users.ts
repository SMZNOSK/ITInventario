// src/server/dto/users.ts
import { z } from "zod";
import { Role, UserStatus } from "@prisma/client";

// helpers de validación contra los enums de Prisma
const RoleEnum = z.string().transform(s => s.toUpperCase()).refine(
  v => Object.values(Role).includes(v as Role),
  { message: "Rol inválido" }
);
const StatusEnum = z.string().transform(s => s.toUpperCase()).refine(
  v => Object.values(UserStatus).includes(v as UserStatus),
  { message: "Status inválido" }
);

export const CreateUserDTO = z.object({
  username: z.string().trim().min(1, "El username es obligatorio"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  password: z.string().min(1, "La contraseña es obligatoria"),
  role: RoleEnum,
  hotelIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const UpdateUserDTO = z.object({
  name: z.string().trim().min(1).optional(),
  role: RoleEnum.optional(),
  status: StatusEnum.optional(),
  password: z.string().min(1).optional(),
  hotelIds: z.array(z.coerce.number().int().positive()).optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserDTO>;
export type UpdateUserInput = z.infer<typeof UpdateUserDTO>;
