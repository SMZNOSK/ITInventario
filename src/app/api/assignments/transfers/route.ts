// src/app/api/assignments/transfers/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";
import type { AssignmentTransferStatus } from "@prisma/client";


// ======================== Types ========================

const CreateTransferDTO = z.object({
    collaboratorId: z.string().min(1, "collaboratorId es requerido"),
    collaboratorName: z.string().optional(),
    destHotelId: z.number().int().positive("destHotelId inválido"),
});

// ======================== POST: Iniciar Transferencia ========================

/**
 * POST /api/assignments/transfers
 * Inicia una transferencia de todas las asignaciones de un colaborador a otro hotel.
 */
export const POST = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const userId = auth.data.id;

    const body = await req.json();
    const dto = CreateTransferDTO.parse(body);

    const { collaboratorId, collaboratorName, destHotelId } = dto;

    // 1. Obtener todas las asignaciones activas del colaborador
    const activeAssignments = await prisma.assignment.findMany({
        where: {
            collaboratorId,
            status: "ASIGNADO",
        },
        include: {
            asset: {
                include: {
                    currentHotel: true,
                    type: true,
                    brand: true,
                    model: true,
                },
            },
            platform: true,
        },
    });

    if (activeAssignments.length === 0) {
        return NextResponse.json(
            { error: "Este colaborador no tiene asignaciones activas." },
            { status: 400 }
        );
    }

    // 2. Verificar que todos los equipos pertenezcan al mismo hotel (origen)
    const originHotelId = activeAssignments[0].asset.currentHotelId;

    if (!originHotelId) {
        return NextResponse.json(
            { error: "Los equipos del colaborador no tienen hotel asignado." },
            { status: 400 }
        );
    }

    const allSameHotel = activeAssignments.every(
        (a) => a.asset.currentHotelId === originHotelId
    );

    if (!allSameHotel) {
        return NextResponse.json(
            {
                error:
                    "Los equipos del colaborador pertenecen a diferentes hoteles. No se puede realizar la transferencia.",
            },
            { status: 400 }
        );
    }

    // 3. Validar que el hotel destino sea diferente al origen
    if (originHotelId === destHotelId) {
        return NextResponse.json(
            { error: "El hotel destino debe ser diferente al hotel origen." },
            { status: 400 }
        );
    }

    // 4. Verificar que no exista una transferencia pendiente para este colaborador
    const existingTransfer = await prisma.assignmentTransfer.findFirst({
        where: {
            collaboratorId,
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
    // Para ADMIN: tiene acceso a todos los hoteles
    // Para ALMACEN/INGENIERO: debe tener el hotel en UserHotel
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
    const transfer = await prisma.assignmentTransfer.create({
        data: {
            collaboratorId,
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
            message: `Transferencia iniciada. ${activeAssignments.length} equipo(s) serán transferidos.`,
            equipmentCount: activeAssignments.length,
        },
        { status: 201 }
    );
});

// ======================== GET: Listar Transferencias ========================

/**
 * GET /api/assignments/transfers
 * Lista las transferencias según el tipo:
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
    const statusFilter = url.searchParams.get("status") as
        | AssignmentTransferStatus
        | null;

    let where: any = {};

    // Filtrar por tipo
    if (type === "received") {
        // Transferencias entrantes hacia mis hoteles
        if (auth.data.role === "ADMIN") {
            // Admin puede ver todas las entrantes
            where = {};
        } else {
            // Solo ver transferencias hacia mis hoteles
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
            // Admin puede ver todas las enviadas
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

    const transfers = await prisma.assignmentTransfer.findMany({
        where,
        include: {
            originHotel: true,
            destHotel: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    // Para cada transferencia, obtener el conteo y lista de equipos
    const transfersWithEquipmentCount = await Promise.all(
        transfers.map(async (t) => {
            const assignments = await prisma.assignment.findMany({
                where: {
                    collaboratorId: t.collaboratorId,
                    status: "ASIGNADO",
                },
                include: {
                    asset: {
                        include: {
                            type: true,
                            brand: true,
                            model: true,
                        },
                    },
                },
            });

            const equipment = assignments.map((a) => ({
                type: a.asset.type?.name || null,
                brand: a.asset.brand?.name || null,
                model: a.asset.model?.name || null,
                serial: a.asset.serial || null,
            }));

            return {
                ...t,
                equipmentCount: assignments.length,
                equipment,
            };
        })
    );

    return NextResponse.json({ items: transfersWithEquipmentCount });
});
