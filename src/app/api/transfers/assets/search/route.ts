// src/app/api/transfers/assets/search/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/transfers/assets/search?serial=XXX
 * Buscar un asset por serial para transferencia
 * Devuelve información completa del asset incluyendo brand, model, hotel actual
 */
export const GET = withError(async (req: NextRequest) => {
    // 1. Autenticación
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // 2. Obtener serial de query params
    const { searchParams } = new URL(req.url);
    const serial = searchParams.get("serial")?.trim().toUpperCase();

    if (!serial) {
        return NextResponse.json(
            { error: "El parámetro 'serial' es requerido" },
            { status: 400 }
        );
    }

    // 3. Buscar el asset
    const asset = await prisma.asset.findUnique({
        where: { serial },
        select: {
            id: true,
            serial: true,
            status: true,
            currentHotelId: true,
            currentHotel: {
                select: {
                    id: true,
                    name: true,
                },
            },
            type: {
                select: {
                    id: true,
                    name: true,
                },
            },
            brand: {
                select: {
                    id: true,
                    name: true,
                },
            },
            model: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    if (!asset) {
        return NextResponse.json(
            { error: "Equipo no encontrado" },
            { status: 404 }
        );
    }

    // 4. Verificar hotel scope si no es ADMIN
    if (auth.data.role !== "ADMIN") {
        if (!asset.currentHotelId || !auth.data.hotels.includes(asset.currentHotelId)) {
            return NextResponse.json(
                { error: "No tienes acceso a este equipo" },
                { status: 403 }
            );
        }
    }

    return NextResponse.json({
        ok: true,
        asset,
    });
});
