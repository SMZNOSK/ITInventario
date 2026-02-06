// src/app/api/disposals/export/xlsx/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withError, http } from "@/server/utils/withError";
import { prisma } from "@/lib/db";
import { requireAuth, getAllowedHotelIds, hasHotelAccess } from "@/server/guards/auth";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

/**
 * GET /api/disposals/export/xlsx?hotelId=<id>&month=<YYYY-MM or 1-12>&year=<2024>
 * Genera un archivo Excel (.xlsx) con el formato específico de bajas de activo fijo
 * month puede ser en formato "YYYY-MM" (e.g., "2024-01") o un número 1-12 con year separado
 */
export const GET = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const url = req.nextUrl;
    const hotelIdParam = url.searchParams.get("hotelId");
    const monthParam = url.searchParams.get("month"); // "YYYY-MM" or 1-12
    const yearParam = url.searchParams.get("year"); // 2024, 2025, etc.

    // Build where clause
    const where: any = {};

    // Hotel filter (optional)
    let hotelName = "todos";
    if (hotelIdParam) {
        const hotelId = Number(hotelIdParam);
        if (!Number.isFinite(hotelId) || hotelId <= 0) {
            throw http.badRequest("hotelId inválido");
        }

        // Validar acceso al hotel
        if (!hasHotelAccess(auth.data, hotelId)) {
            throw http.forbidden("No tienes acceso a ese hotel");
        }

        where.hotelId = hotelId;

        // Obtener el nombre del hotel
        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            select: { name: true },
        });

        if (!hotel) {
            throw http.notFound("Hotel no encontrado");
        }
        hotelName = hotel.name;
    } else {
        // Si no se especifica hotel, filtrar por hoteles accesibles
        const allowedHotelIds = getAllowedHotelIds(auth.data);
        if (allowedHotelIds && allowedHotelIds.length > 0) {
            where.hotelId = { in: allowedHotelIds };
        }
    }

    // Month/Year filter (optional)
    let dateRangeLabel = "";
    if (monthParam) {
        let month: number;
        let year: number;

        // Check if month is in "YYYY-MM" format
        if (monthParam.includes("-")) {
            const [yearStr, monthStr] = monthParam.split("-");
            year = Number(yearStr);
            month = Number(monthStr);
        } else if (yearParam) {
            // Legacy format: separate month and year parameters
            month = Number(monthParam);
            year = Number(yearParam);
        } else {
            throw http.badRequest("Si usas month numérico, debes proporcionar year");
        }

        if (!Number.isFinite(month) || month < 1 || month > 12) {
            throw http.badRequest("month debe estar entre 1 y 12");
        }
        if (!Number.isFinite(year) || year < 2000 || year > 2100) {
            throw http.badRequest("year inválido");
        }

        // Create date range for the specified month
        const startDate = new Date(year, month - 1, 1); // First day of month
        const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month

        where.disposedAt = {
            gte: startDate,
            lte: endDate,
        };

        const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
        dateRangeLabel = `_${monthNames[month - 1]}_${year}`;
    }

    // Obtener bajas con evidencias
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
            evidences: true,
        },
        orderBy: { disposedAt: "desc" },
    });

    // Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Bajas");

    // ========== ENCABEZADO ==========

    // Row 1: TÍTULO (merged)
    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "FORMATO DE BAJA DE ACTIVO FIJO";
    titleCell.font = { bold: true, size: 14, name: "Arial" };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    worksheet.getRow(1).height = 25;

    // Row 2: Hotel y Fecha
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
            fgColor: { argb: "FF00A884" }, // Verde turquesa como en la imagen
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

    // Rows 7+: Datos
    let rowIndex = 7;
    for (const disposal of disposals) {
        const row = worksheet.getRow(rowIndex);

        // Limpiar notas eliminando las URLs de evidencia embebidas
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
            disposal.reason, // Dictamen = Motivo
            disposal.restoredAt ? "Restaurado" : "BAJA",
            "", // Foto (se agregará como imagen)
            cleanNotes,
        ];

        // Aplicar bordes a todas las celdas
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

        // Si hay evidencias, agregar la primera como imagen
        if (disposal.evidences.length > 0) {
            const evidence = disposal.evidences[0];
            const imagePath = path.join(process.cwd(), "public", evidence.url);

            try {
                if (fs.existsSync(imagePath)) {
                    const imageBuffer = fs.readFileSync(imagePath);
                    const ext = path.extname(imagePath).slice(1).toLowerCase();

                    // Validar extensión
                    const validExts = ["png", "jpg", "jpeg"];
                    if (validExts.includes(ext)) {
                        const imageId = workbook.addImage({
                            buffer: imageBuffer,
                            extension: ext === "jpg" ? "jpeg" : ext,
                        });

                        // Agregar imagen a la celda H (columna 8)
                        // tl = top-left, br = bottom-right (usando coordenadas de celda)
                        worksheet.addImage(imageId, {
                            tl: { col: 7, row: rowIndex - 1 }, // col 7 = columna H (0-indexed)
                            br: { col: 8, row: rowIndex },
                            editAs: "oneCell",
                        });
                    }
                }
            } catch (err) {
                console.error(`Error al cargar imagen ${imagePath}:`, err);
            }
        }

        row.height = 60; // Altura para que quepa la imagen
        rowIndex++;
    }

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

    // Generar nombre de archivo
    const hotelSlug = hotelName.replace(/\s+/g, "_").toLowerCase();
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `bajas_${hotelSlug}${dateRangeLabel}_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
});
