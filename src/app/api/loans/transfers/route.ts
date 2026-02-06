// src/app/api/loans/transfers/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withError } from "@/server/utils/withError";
import { requireAuth } from "@/server/guards/auth";
import { prisma } from "@/lib/db";
import type { LoanTransferStatus } from "@prisma/client";

// ======================== Types ========================

const CreateLoanTransferDTO = z.object({
    collaboratorId: z.string().min(1, "collaboratorId es requerido"),
    collaboratorName: z.string().optional(),
    destHotelId: z.number().int().positive("destHotelId inválido"),
});

// ======================== POST: Iniciar Transferencia ========================

/**
 * POST /api/loans/transfers
 * Inicia una transferencia de todos los préstamos activos de un colaborador a otro hotel.
 */
export const POST = withError(async (req: NextRequest) => {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.res;

    const userId = auth.data.id;

    const body = await req.json();
    const dto = CreateLoanTransferDTO.parse(body);

    const { collaboratorId, collaboratorName, destHotelId } = dto;

    // 1. Obtener todos los préstamos del colaborador
    // NOTA: El modelo Loan NO tiene campo isReturned.
    // Los préstamos son registros independientes de los assets.
    const activeLoans = await prisma.loan.findMany({
        where: {
            collaboratorId,
        },
        include: {
            hotel: true,
            platform: true,
        },
    });

    if (activeLoans.length === 0) {
        return NextResponse.json(
            { error: "Este colaborador no tiene préstamos activos." },
            { status: 400 }
        );
    }

    // 2. Verificar que todos los préstamos pertenezcan al mismo hotel (origen)
    const originHotelId = activeLoans[0].hotelId;

    if (!originHotelId) {
        return NextResponse.json(
            { error: "Los préstamos del colaborador no tienen hotel asignado." },
            { status: 400 }
        );
    }

    const allSameHotel = activeLoans.every((loan) => loan.hotelId === originHotelId);

    if (!allSameHotel) {
        return NextResponse.json(
            {
                error:
                    "Los préstamos del colaborador pertenecen a diferentes hoteles. No se puede realizar la transferencia.",
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
    const existingTransfer = await prisma.loanTransfer.findFirst({
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
    const transfer = await prisma.loanTransfer.create({
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
            message: `Transferencia de préstamos iniciada. ${activeLoans.length} préstamo(s) serán transferidos.`,
            loanCount: activeLoans.length,
        },
        { status: 201 }
    );
});

// ======================== GET: Listar Transferencias ========================

/**
 * GET /api/loans/transfers
 * Lista las transferencias de préstamos según el tipo:
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
    const statusFilter = url.searchParams.get("status") as LoanTransferStatus | null;

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

    const transfers = await prisma.loanTransfer.findMany({
        where,
        include: {
            originHotel: true,
            destHotel: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    // Para cada transferencia, obtener el conteo y lista de préstamos con equipos
    const transfersWithLoanCount = await Promise.all(
        transfers.map(async (t) => {
            const loans = await prisma.loan.findMany({
                where: {
                    collaboratorId: t.collaboratorId,
                },
            });

            // Extraer equipos de cada préstamo
            const equipment: Array<{
                type: string | null;
                brand: string | null;
                model: string | null;
                serial: string | null;
            }> = [];

            for (const loan of loans) {
                // Extraer serial de deviceName o teamName
                const extractSerial = (text: string | null): string | null => {
                    if (!text) return null;
                    // Patrón S/N: SERIAL
                    let match = text.match(/(?:S\/N|Serial|SN|SERIE|No\.?\s*Serie)[:\s]+([A-Za-z0-9-]+)/i);
                    if (match) return match[1].trim();
                    // Patrón LAP-000001 · SERIAL
                    match = text.match(/[·•]\s*([A-Za-z0-9]+)/);
                    if (match) return match[1].trim();
                    // Alfanumérico de 6+ chars que NO sea código de equipo
                    const tokens = text.split(/[^A-Za-z0-9-]+/).filter(t => t.length >= 6);
                    for (const token of tokens) {
                        if (!/^[A-Z]{3}-\d{6}$/i.test(token)) return token.trim();
                    }
                    return null;
                };

                const serial = extractSerial((loan as any).deviceName) || extractSerial((loan as any).teamName);

                if (serial) {
                    // Buscar asset por serial
                    const asset = await prisma.asset.findFirst({
                        where: { serial },
                        include: {
                            type: { select: { name: true } },
                            brand: { select: { name: true } },
                            model: { select: { name: true } },
                        },
                    });

                    if (asset) {
                        equipment.push({
                            type: asset.type?.name || null,
                            brand: asset.brand?.name || null,
                            model: asset.model?.name || null,
                            serial: asset.serial,
                        });
                    }
                }
            }

            return {
                ...t,
                loanCount: loans.length,
                equipment,
            };
        })
    );

    return NextResponse.json({ items: transfersWithLoanCount });
});
