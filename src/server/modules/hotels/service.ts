// src/server/modules/hotels/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { CreateHotelInput, UpdateHotelInput } from "@/server/dto/hotels";

export const hotelsService = {
  async listAll() {
    const hotels = await prisma.hotel.findMany({ orderBy: { name: "asc" } });
    // Transformar isActive a active para compatibilidad con el frontend
    return hotels.map((h) => ({
      ...h,
      active: h.isActive,
    }));
  },

  async getById(id: number) {
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) return null;
    return {
      ...hotel,
      active: hotel.isActive,
    };
  },

  create(data: CreateHotelInput) {
    return prisma.hotel.create({ data: { name: data.name } });
  },

  async update(id: number, data: UpdateHotelInput) {
    const updated = await prisma.hotel.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(typeof data.active === "boolean" ? { isActive: data.active } : {}),
      },
    });
    return {
      ...updated,
      active: updated.isActive,
    };
  },

  async setActive(id: number, active: boolean) {
    const updated = await prisma.hotel.update({
      where: { id },
      data: { isActive: active },
    });
    return {
      ...updated,
      active: updated.isActive,
    };
  },

  delete(id: number) {
    return prisma.hotel.delete({ where: { id } });
  },
};
