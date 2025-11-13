// src/server/modules/hotels/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { CreateHotelInput, UpdateHotelInput } from "@/server/dto/hotels";

export const hotelsService = {
  listAll() {
    return prisma.hotel.findMany({ orderBy: { name: "asc" } });
  },

  getById(id: number) {
    return prisma.hotel.findUnique({ where: { id } });
  },

  create(data: CreateHotelInput) {
    return prisma.hotel.create({ data: { name: data.name } });
  },

  update(id: number, data: UpdateHotelInput) {
    return prisma.hotel.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(typeof data.active === "boolean" ? { active: data.active } : {}),
      },
    });
  },

  setActive(id: number, active: boolean) {
    return prisma.hotel.update({ where: { id }, data: { active } });
  },

  delete(id: number) {
    return prisma.hotel.delete({ where: { id } });
  },
};
