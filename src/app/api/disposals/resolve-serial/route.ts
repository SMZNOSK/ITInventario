// src/app/api/disposals/resolve-serial/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { requireAuth, hasHotelAccess } from "@/server/guards/auth";

/**
 * POST /api/disposals/resolve-serial
 * Resuelve un serial y devuelve los datos del equipo para la pantalla de baja.
 * Valida que el usuario tenga acceso al hotel del equipo.
 */
export const POST = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const body = await req.json();
    const serial = String(body.serial ?? "").trim();

    if (!serial) {
        throw http.badRequest("Serial requerido");
    }

    // Normalizar: convertir a mayúsculas y limpiar espacios
    const normalizedSerial = serial.toUpperCase().replace(/\s+/g, "");

    // Buscar primero por serial exacto, luego normalizado
    let asset = await prisma.asset.findUnique({
        where: { serial },
        include: {
            type: true,
            brand: true,
            model: true,
            currentHotel: true,
        },
    });

    // Si no encontramos por serial exacto, intentar por serial normalizado
    if (!asset) {
        asset = await prisma.asset.findFirst({
            where: {
                serial: {
                    equals: normalizedSerial,
                    mode: "insensitive",
                },
            },
            include: {
                type: true,
                brand: true,
                model: true,
                currentHotel: true,
            },
        });
    }

    if (!asset) {
        throw http.notFound("Equipo no encontrado");
    }

    // Validar acceso al hotel del equipo
    if (!hasHotelAccess(auth.data, asset.currentHotelId)) {
        throw http.forbidden("No tienes acceso al hotel de este equipo");
    }

    // Validar que el equipo no esté ya en BAJA
    if (asset.status === "BAJA") {
        throw http.conflict("El equipo ya está dado de baja");
    }

    return NextResponse.json({
        assetId: asset.id,
        serial: asset.serial,
        status: asset.status,
        typeName: asset.type?.name ?? null,
        brandName: asset.brand?.name ?? null,
        modelName: asset.model?.name ?? null,
        hotelId: asset.currentHotelId,
        hotelName: asset.currentHotel?.name ?? null,
    });
});
