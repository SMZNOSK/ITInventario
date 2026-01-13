// src/app/api/disposals/export/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/server/guards/auth";

// Helper: Extract evidence image URLs from notes field
function extractEvidenceUrls(notes?: string | null): string[] {
    if (!notes) return [];
    const regex = /\/uploads\/evidence\/[^\s\n]+/g;
    const matches = notes.match(regex);
    return matches || [];
}

/**
 * GET /api/disposals/export?hotelId=<id>
 * Genera un CSV con las bajas del hotel especificado.
 * Incluye columna de Evidencia con URLs de imágenes.
 */
export const GET = withError(async (req: NextRequest) => {
    // Auth check
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const url = req.nextUrl;
    const hotelIdParam = url.searchParams.get("hotelId");

    // Build where clause
    const where: any = {};
    if (hotelIdParam) {
        const hotelId = Number(hotelIdParam);
        if (!Number.isInteger(hotelId) || hotelId <= 0) {
            throw http.badRequest("hotelId inválido");
        }

        // Filter by hotel for non-admins
        if (auth.data.role !== "ADMIN" && !auth.data.hotels.includes(hotelId)) {
            throw http.forbidden("No tienes acceso a ese hotel");
        }
        where.hotelId = hotelId;
    } else if (auth.data.role !== "ADMIN") {
        // Non-admin without hotelId filter: only their hotels
        where.hotelId = { in: auth.data.hotels };
    }

    // Get base URL for absolute image paths
    const baseUrl = url.origin;

    // Fetch disposals with full asset info
    const disposals = await prisma.disposal.findMany({
        where,
        include: {
            asset: {
                include: {
                    type: true,
                    brand: true,
                    model: true,
                    currentHotel: true,
                },
            },
            hotel: true,
            createdBy: {
                select: { name: true },
            },
        },
        orderBy: { disposedAt: "desc" },
    });

    // Build CSV content with Evidence column
    const headers = [
        "Serial",
        "Tipo",
        "Marca",
        "Modelo",
        "Hotel",
        "Motivo",
        "Notas",
        "Fecha Baja",
        "Estado",
        "Registrado Por",
        "Evidencia (URLs)",
    ];

    const rows = disposals.map((d) => {
        // Extract image URLs from notes
        const evidenceUrls = extractEvidenceUrls(d.notes);
        const evidenceFullUrls = evidenceUrls.map((u) => `${baseUrl}${u}`);

        // Clean notes (remove evidence URLs for cleaner output)
        let cleanNotes = d.notes || "";
        if (cleanNotes.includes("Evidencia:")) {
            cleanNotes = cleanNotes.split("Evidencia:")[0].trim();
        }

        return [
            d.asset.serial,
            d.asset.type?.name || "",
            d.asset.brand?.name || "",
            d.asset.model?.name || "",
            d.hotel?.name || d.asset.currentHotel?.name || "",
            d.reason,
            cleanNotes.replace(/"/g, '""'), // Escape quotes
            new Date(d.disposedAt).toLocaleDateString("es-MX"),
            "En Baja",
            d.createdBy?.name || "",
            evidenceFullUrls.join(" | "),
        ];
    });

    // Build CSV string (UTF-8 BOM for Excel compatibility)
    const BOM = "\uFEFF";
    const csvContent =
        BOM +
        headers.join(",") +
        "\n" +
        rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    // Get hotel name for filename
    let filename = "bajas_equipo";
    if (hotelIdParam && disposals.length > 0) {
        const hotelName = disposals[0].hotel?.name || "hotel";
        filename = `bajas_${hotelName.replace(/\s+/g, "_").toLowerCase()}`;
    }
    filename += `_${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
});
