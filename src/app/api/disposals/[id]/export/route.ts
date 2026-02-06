// src/app/api/disposals/[id]/export/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { requireAuth, hasHotelAccess } from "@/server/guards/auth";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

type RouteContext = {
    params: Promise<{ id: string }>;
};

function parseId(raw: string): number {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
        throw http.badRequest("id inválido");
    }
    return id;
}

/**
 * GET /api/disposals/:id/export
 * Exporta una sola baja a Excel con el formato completo
 */
export const GET = withError(async (req: NextRequest, context: RouteContext) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const { id } = await context.params;
    const disposalId = parseId(id);

    // Obtener la baja con todas sus relaciones
    const disposal = await prisma.disposal.findUnique({
        where: { id: disposalId },
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
            createdBy: { select: { name: true } },
            evidences: true,
        },
    });

    if (!disposal) {
        throw http.notFound("Baja no encontrada");
    }

    // Validar acceso
    const hotelId = disposal.hotelId ?? disposal.asset.currentHotelId;
    if (!hasHotelAccess(auth.data, hotelId)) {
        throw http.forbidden("No tienes acceso a esta baja");
    }

    // Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Baja");

    // ========== ENCABEZADO ==========

    // Row 1: TÍTULO (merged)
    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "FORMATO DE BAJA DE ACTIVO FIJO";
    titleCell.font = { bold: true, size: 14, name: "Arial" };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 25;

    // Row 2: Hotel y Fecha
    const hotelName = disposal.hotel?.name || disposal.asset.currentHotel?.name || "N/A";
    worksheet.getCell("A2").value = "Hotel:";
    worksheet.getCell("A2").font = { bold: true, name: "Arial" };
    worksheet.getCell("B2").value = hotelName;

    worksheet.getCell("F2").value = "Fecha:";
    worksheet.getCell("F2").font = { bold: true, name: "Arial" };
    worksheet.getCell("G2").value = new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

    // Row 3: Compañía
    worksheet.getCell("A3").value = "Compañía:";
    worksheet.getCell("A3").font = { bold: true, name: "Arial" };
    worksheet.getCell("B3").value = "Palace Resorts, S.A de C.V";

    // Row 4: Tipo de Activo
    worksheet.getCell("A4").value = "Tipo de Activo:";
    worksheet.getCell("A4").font = { bold: true, name: "Arial" };
    worksheet.getCell("B4").value = "EQUIPO DE OPERACIÓN";

    // Row 5: Dirección y Área
    worksheet.getCell("A5").value = "Dirección:";
    worksheet.getCell("A5").font = { bold: true, name: "Arial" };
    worksheet.getCell("B5").value = "TECNOLOGÍA DE LA INFORMACIÓN";

    worksheet.getCell("F5").value = "Area:";
    worksheet.getCell("F5").font = { bold: true, name: "Arial" };
    worksheet.getCell("G5").value = "SOPORTE TÉCNICO CEDIS";

    // ========== TABLA ==========

    // Row 6: Headers
    const headers = ["Cantidad", "Descripcion", "Marca", "Model", "Serie", "Dictamen", "Status", "Foto", "Observaciones"];
    const headerRow = worksheet.getRow(6);
    headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF00A884" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
    });
    headerRow.height = 20;

    // Row 7: Datos de esta baja
    const row = worksheet.getRow(7);

    // Limpiar notas
    let cleanNotes = disposal.notes || "";
    if (cleanNotes.includes("Evidencia:")) {
        cleanNotes = cleanNotes.split("Evidencia:")[0].trim();
    }

    row.values = [
        1, // Cantidad
        disposal.asset.type?.name || "",
        disposal.asset.brand?.name || "",
        disposal.asset.model?.name || "",
        disposal.asset.serial,
        disposal.reason,
        disposal.restoredAt ? "Restaurado" : "BAJA",
        "",
        cleanNotes,
    ];

    // Aplicar bordes
    for (let col = 1; col <= 9; col++) {
        const cell = row.getCell(col);
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", wrapText: true };
    }

    // Centrar cantidad y status
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };

    // Agregar imagen si hay evidencias
    if (disposal.evidences.length > 0) {
        const evidence = disposal.evidences[0];
        const imagePath = path.join(process.cwd(), "public", evidence.url);

        try {
            if (fs.existsSync(imagePath)) {
                const imageBuffer = fs.readFileSync(imagePath);
                const ext = path.extname(imagePath).slice(1).toLowerCase();

                const validExts = ["png", "jpg", "jpeg"];
                if (validExts.includes(ext)) {
                    const imageId = workbook.addImage({
                        buffer: imageBuffer,
                        extension: ext === "jpg" ? "jpeg" : ext,
                    });

                    worksheet.addImage(imageId, {
                        tl: { col: 7, row: 6 },
                        br: { col: 8, row: 7 },
                        editAs: "oneCell",
                    });
                }
            }
        } catch (err) {
            console.error(`Error al cargar imagen ${imagePath}:`, err);
        }
    }

    row.height = 60;

    // ========== ANCHOS DE COLUMNA ==========
    worksheet.columns = [
        { width: 10 },  // Cantidad
        { width: 18 },  // Descripcion
        { width: 12 },  // Marca
        { width: 15 },  // Model
        { width: 18 },  // Serie
        { width: 22 },  // Dictamen
        { width: 12 },  // Status
        { width: 15 },  // Foto
        { width: 35 },  // Observaciones
    ];

    // ========== GENERAR BUFFER ==========
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `baja_${disposal.asset.serial}_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
});
