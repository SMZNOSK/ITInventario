// src/app/api/assignments/manual/transfers/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";
import type { ManualAssignmentTransferStatus } from "@prisma/client";

// ======================== Types ========================

const CreateManualAssignmentTransferDTO = z.object({
    collaboratorKey: z.string().min(1, "collaboratorKey es requerido"),
    collaboratorName: z.string().optional(),
    destHotelId: z.number().int().positive("destHotelId inválido"),
});

// ======================== POST: Iniciar Transferencia ========================

/**
 * POST /api/assignments/manual/transfers
 * Inicia una transferencia de todas las asignaciones manuales de un colaborador a otro hotel.
 */
export const POST = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const userId = auth.data.id;

    const body = await req.json();
    const dto = CreateManualAssignmentTransferDTO.parse(body);

    const { collaboratorKey, collaboratorName, destHotelId } = dto;

    // Normalizar clave para búsqueda
    const normalizedKey = collaboratorKey.trim().toLowerCase();

    console.log("=== DEBUG TRANSFER ===");
    console.log("collaboratorKey recibido:", collaboratorKey);
    console.log("normalizedKey:", normalizedKey);

    // 1. Obtener todas las asignaciones manuales del colaborador
    const manualAssignments = await prisma.manualAssignment.findMany({
        where: {
            status: "ASIGNADO", // Solo asignaciones activas
        },
    });

    console.log("Total asignaciones ASIGNADO:", manualAssignments.length);

    // Filtrar por clave - NO usar hotelLabel porque está vacío en la BD
    const matchingAssignments = manualAssignments.filter((a) => {
        const name = String(a.collaboratorName || "").trim();
        const email = String(a.collaboratorEmail || "").trim();
        const dept = String(a.department || "").trim();

        // Extraer partes del normalizedKey (name||email||hotel||dept)
        const parts = normalizedKey.split("||");
        const searchName = (parts[0] || "").trim();
        const searchEmail = (parts[1] || "").trim();
        const searchDept = (parts[3] || "").trim();

        // Comparar sin incluir hotel
        const match1 = name.toLowerCase() === searchName &&
            email.toLowerCase() === searchEmail &&
            dept.toLowerCase() === searchDept;

        const match2 = name.toLowerCase() === searchName &&
            email.toLowerCase() === searchEmail;

        const match3 = name.toLowerCase() === searchName;

        const matches = match1 || match2 || match3;

        if (name.toLowerCase().includes("sebastian")) {
            console.log("Checking assignment for Sebastian:");
            console.log("  name:", name, "=", searchName, "?", name.toLowerCase() === searchName);
            console.log("  email:", email, "=", searchEmail, "?", email.toLowerCase() === searchEmail);
            console.log("  dept:", dept, "=", searchDept, "?", dept.toLowerCase() === searchDept);
            console.log("  matches:", matches);
        }

        return matches;
    });

    console.log("Matching assignments found:", matchingAssignments.length);
    console.log("=== END DEBUG ===");

    if (matchingAssignments.length === 0) {
        return NextResponse.json(
            { error: "Este colaborador no tiene asignaciones manuales activas." },
            { status: 400 }
        );
    }

    // 2. Obtener el hotel desde la clave (position 2: name||email||HOTEL||dept)
    const keyParts = collaboratorKey.split("||");
    const hotelNameFromKey = (keyParts[2] || "").trim();

    console.log("Hotel desde key:", hotelNameFromKey);

    if (!hotelNameFromKey) {
        return NextResponse.json(
            { error: "No se pudo determinar el hotel de origen desde la clave del colaborador." },
            { status: 400 }
        );
    }

    // Buscar el hotel de origen por nombre
    const originHotel = await prisma.hotel.findFirst({
        where: {
            name: {
                contains: hotelNameFromKey,
                mode: "insensitive",
            },
        },
    });

    console.log("Hotel encontrado:", originHotel?.name);

    if (!originHotel) {
        return NextResponse.json(
            { error: `No se encontró el hotel de origen: ${hotelNameFromKey}` },
            { status: 400 }
        );
    }

    const originHotelId = originHotel.id;

    // 3. Validar que el hotel destino sea diferente al origen
    if (originHotelId === destHotelId) {
        return NextResponse.json(
            { error: "El hotel destino debe ser diferente al hotel origen." },
            { status: 400 }
        );
    }

    // 4. Verificar que no exista una transferencia pendiente para este colaborador
    const existingTransfer = await prisma.manualAssignmentTransfer.findFirst({
        where: {
            collaboratorKey: normalizedKey,
            status: "PENDING",
        },
    });

    if (existingTransfer) {
        return NextResponse.json(
            {
                error:
                    "Ya existe una transferencia pendiente para este colaborador. Cancela o completa la transferencia anterior antes de crear una nueva.",
            },
            { status: 400 }
        );
    }

    // 5. Validar permisos del usuario (debe tener acceso al hotel origen)
    if (auth.data.role !== "ADMIN") {
        const hasAccess = await prisma.userHotel.findFirst({
            where: {
                userId,
                hotelId: originHotelId,
            },
        });

        if (!hasAccess) {
            return NextResponse.json(
                { error: "No tienes permisos para transferir desde este hotel." },
                { status: 403 }
            );
        }
    }

    // 6. Crear la transferencia
    const transfer = await prisma.manualAssignmentTransfer.create({
        data: {
            collaboratorKey: normalizedKey,
            collaboratorName: collaboratorName || null,
            originHotelId,
            destHotelId,
            status: "PENDING",
            createdByUserId: userId,
        },
        include: {
            originHotel: true,
            destHotel: true,
        },
    });

    return NextResponse.json(
        {
            transfer,
            message: `Transferencia de asignaciones manuales iniciada. ${matchingAssignments.length} asignación(es) serán transferidas.`,
            assignmentCount: matchingAssignments.length,
        },
        { status: 201 }
    );
});

// ======================== GET: Listar Transferencias ========================

/**
 * GET /api/assignments/manual/transfers
 * Lista las transferencias de asignaciones manuales según el tipo:
 * - ?type=received&status=PENDING : transferencias entrantes pendientes
 * - ?type=sent : transferencias enviadas
 * - ?type=all : todas las transferencias (solo admin)
 */
export const GET = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const userId = auth.data.id;
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "received";
    const statusFilter = url.searchParams.get("status") as ManualAssignmentTransferStatus | null;

    let where: any = {};

    // Filtrar por tipo
    if (type === "received") {
        // Transferencias entrantes hacia mis hoteles
        if (auth.data.role === "ADMIN") {
            where = {};
        } else {
            const userHotels = await prisma.userHotel.findMany({
                where: { userId },
                select: { hotelId: true },
            });

            const hotelIds = userHotels.map((uh) => uh.hotelId);
            where.destHotelId = { in: hotelIds };
        }
    } else if (type === "sent") {
        // Transferencias enviadas desde mis hoteles
        if (auth.data.role === "ADMIN") {
            where = {};
        } else {
            const userHotels = await prisma.userHotel.findMany({
                where: { userId },
                select: { hotelId: true },
            });

            const hotelIds = userHotels.map((uh) => uh.hotelId);
            where.originHotelId = { in: hotelIds };
        }
    } else if (type === "all") {
        // Solo admin puede ver todas
        if (auth.data.role !== "ADMIN") {
            return NextResponse.json(
                { error: "No tienes permisos para ver todas las transferencias." },
                { status: 403 }
            );
        }
        where = {};
    }

    // Filtrar por status si se especifica
    if (statusFilter) {
        where.status = statusFilter;
    }

    const transfers = await prisma.manualAssignmentTransfer.findMany({
        where,
        include: {
            originHotel: true,
            destHotel: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    // Para cada transferencia, obtener el conteo y detalles de asignaciones
    const transfersWithAssignmentDetails = await Promise.all(
        transfers.map(async (t) => {
            // Buscar asignaciones que coincidan con la clave
            const allAssignments = await prisma.manualAssignment.findMany({
                where: {
                    status: "ASIGNADO",
                },
            });

            const matchingAssignments = allAssignments.filter((a) => {
                const name = String(a.collaboratorName || "").trim();
                const email = String(a.collaboratorEmail || "").trim();
                const dept = String(a.department || "").trim();

                // Extraer partes de la clave guardada (name||email||hotel||dept)
                const keyParts = t.collaboratorKey.split("||");
                const searchName = (keyParts[0] || "").trim();
                const searchEmail = (keyParts[1] || "").trim();
                const searchDept = (keyParts[3] || "").trim();

                // Comparar sin usar hotel
                const match1 = name.toLowerCase() === searchName &&
                    email.toLowerCase() === searchEmail &&
                    dept.toLowerCase() === searchDept;

                const match2 = name.toLowerCase() === searchName &&
                    email.toLowerCase() === searchEmail;

                const match3 = name.toLowerCase() === searchName;

                return match1 || match2 || match3;
            });

            // Obtener detalles de equipos desde Asset
            const equipment = await Promise.all(
                matchingAssignments.map(async (assignment) => {
                    const assetId = assignment.assetId;

                    if (!assetId) {
                        return {
                            type: "—",
                            brand: "—",
                            model: "—",
                            serial: "—",
                        };
                    }

                    // Buscar el equipo en la tabla Asset por ID
                    const asset = await prisma.asset.findUnique({
                        where: {
                            id: assetId,
                        },
                        include: {
                            type: true,
                            brand: true,
                            model: true,
                        },
                    });

                    if (asset) {
                        return {
                            type: asset.type?.name || "—",
                            brand: asset.brand?.name || "—",
                            model: asset.model?.name || "—",
                            serial: asset.serial || "—",
                        };
                    }

                    // Si no se encuentra el asset
                    return {
                        type: "—",
                        brand: "—",
                        model: "—",
                        serial: "—",
                    };
                })
            );

            return {
                ...t,
                assignmentCount: matchingAssignments.length,
                equipment,
            };
        })
    );

    return NextResponse.json({ items: transfersWithAssignmentDetails });
});
