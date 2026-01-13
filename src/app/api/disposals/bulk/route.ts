// src/app/api/disposals/bulk/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { requireAuth, ensureRole, ensureHotelAccess } from "@/server/guards/auth";

/**
 * POST /api/disposals/bulk
 * Registra múltiples bajas de una sola vez.
 * Solo usuarios con acceso a los hoteles de los assets pueden dar de baja.
 * Body: { serials: string[], reason: string, notes?: string }
 */
export const POST = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    // Permitir ADMIN, ALMACEN, INGENIERO crear bajas
    const deny = ensureRole(auth.data, "ADMIN", "ALMACEN", "INGENIERO");
    if (deny) return deny;

    const body = await req.json();
    const { serials, reason, notes } = body as {
        serials: string[];
        reason: string;
        notes?: string;
    };

    if (!Array.isArray(serials) || serials.length === 0) {
        throw http.badRequest("Debes proporcionar al menos un serial");
    }

    if (!reason?.trim()) {
        throw http.badRequest("El motivo es obligatorio");
    }

    // Clean serials
    const cleanSerials = serials
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    if (cleanSerials.length === 0) {
        throw http.badRequest("No se encontraron seriales válidos");
    }

    // Find all assets by serial
    const assets = await prisma.asset.findMany({
        where: {
            serial: { in: cleanSerials },
        },
        include: {
            currentHotel: true,
        },
    });

    const foundSerials = assets.map((a) => a.serial);
    const notFoundSerials = cleanSerials.filter(
        (s) => !foundSerials.includes(s)
    );
    const alreadyBaja = assets.filter((a) => a.status === "BAJA");

    // Filtrar assets a los que el usuario tiene acceso
    const isAdmin = auth.data.role === "ADMIN";
    const userHotels = auth.data.hotels;

    const accessibleAssets = assets.filter((a) => {
        if (a.status === "BAJA") return false; // Ya está en baja
        if (isAdmin) return true;
        if (!a.currentHotelId) return false; // Sin hotel asignado
        return userHotels.includes(a.currentHotelId);
    });

    const noAccessAssets = assets.filter((a) => {
        if (a.status === "BAJA") return false;
        if (isAdmin) return false;
        if (!a.currentHotelId) return true;
        return !userHotels.includes(a.currentHotelId);
    });

    if (accessibleAssets.length === 0) {
        throw http.badRequest(
            `No se encontraron equipos elegibles para baja. ` +
            (notFoundSerials.length > 0 ? `No encontrados: ${notFoundSerials.join(", ")}. ` : "") +
            (alreadyBaja.length > 0 ? `Ya en baja: ${alreadyBaja.map(a => a.serial).join(", ")}. ` : "") +
            (noAccessAssets.length > 0 ? `Sin acceso: ${noAccessAssets.map(a => a.serial).join(", ")}` : "")
        );
    }

    // Create disposals in transaction
    const result = await prisma.$transaction(async (tx) => {
        const disposals = [];

        for (const asset of accessibleAssets) {
            // Check for active assignments
            const activeAssignment = await tx.assignment.findFirst({
                where: {
                    assetId: asset.id,
                    endDate: null,
                },
            });

            if (activeAssignment) {
                throw new Error(
                    `El equipo ${asset.serial} tiene asignación activa. Debe liberarse primero.`
                );
            }

            // Create disposal
            const disposal = await tx.disposal.create({
                data: {
                    assetId: asset.id,
                    hotelId: asset.currentHotelId ?? null,
                    reason: reason.trim(),
                    notes: notes?.trim() ?? null,
                    disposedAt: new Date(),
                },
            });

            // Update asset status
            await tx.asset.update({
                where: { id: asset.id },
                data: { status: "BAJA" },
            });

            disposals.push({
                id: disposal.id,
                serial: asset.serial,
            });
        }

        return disposals;
    });

    return NextResponse.json({
        success: true,
        message: `${result.length} equipo(s) dado(s) de baja correctamente`,
        created: result,
        notFound: notFoundSerials,
        alreadyBaja: alreadyBaja.map((a) => a.serial),
        noAccess: noAccessAssets.map((a) => a.serial),
    });
});
