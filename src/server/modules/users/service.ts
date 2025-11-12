// src/server/modules/users/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { UserStatus, Role, User, UserHotel, Hotel } from "@prisma/client";

export type UserWithHotels = User & {
  hotels: (UserHotel & { hotel: Hotel })[];
};

export type CreateUserInput = {
  username: string;
  name: string;
  passwordHash: string;
  role: Role;
  hotelIds?: number[];
};

export type UpdateUserInput = {
  name?: string;
  passwordHash?: string;
  role?: Role;
  status?: UserStatus;
  hotelIds?: number[];
};

export const usersService = {
  async listAll(): Promise<UserWithHotels[]> {
    return prisma.user.findMany({
      orderBy: { id: "asc" },
      include: { hotels: { include: { hotel: true } } },
    }) as any;
  },

  async getById(id: number): Promise<UserWithHotels | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { hotels: { include: { hotel: true } } },
    }) as any;
  },

  async create(data: CreateUserInput): Promise<UserWithHotels> {
    const username = data.username.trim().toLowerCase();
    const name = data.name.trim();
    const hotelIds = data.hotelIds ?? [];

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          name,
          role: data.role,
          passwordHash: data.passwordHash,
          // status usa default (ALTA) del schema
        },
      });

      if (hotelIds.length > 0) {
        const uniqueIds = [...new Set(hotelIds)];
        await tx.userHotel.createMany({
          data: uniqueIds.map((hotelId) => ({ userId: user.id, hotelId })),
          skipDuplicates: true,
        });
      }

      const full = await tx.user.findUnique({
        where: { id: user.id },
        include: { hotels: { include: { hotel: true } } },
      });

      if (!full) throw new Error("User not found after create");
      return full as any;
    });
  },

  async update(id: number, data: UpdateUserInput): Promise<UserWithHotels> {
    const hotelIds = data.hotelIds;

    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          name: data.name?.trim(),
          role: data.role,
          status: data.status,
          ...(data.passwordHash ? { passwordHash: data.passwordHash } : {}),
        },
      });

      if (hotelIds) {
        await tx.userHotel.deleteMany({ where: { userId: id } });
        if (hotelIds.length > 0) {
          const uniqueIds = [...new Set(hotelIds)];
          await tx.userHotel.createMany({
            data: uniqueIds.map((hotelId) => ({ userId: id, hotelId })),
            skipDuplicates: true,
          });
        }
      }

      const full = await tx.user.findUnique({
        where: { id },
        include: { hotels: { include: { hotel: true } } },
      });

      if (!full) throw new Error("User not found after update");
      return full as any;
    });
  },

  async setStatus(id: number, status: UserStatus): Promise<UserWithHotels> {
    return prisma.user.update({
      where: { id },
      data: { status },
      include: { hotels: { include: { hotel: true } } },
    }) as any;
  },

  async delete(id: number): Promise<void> {
    await prisma.user.delete({ where: { id } });
  },
};
