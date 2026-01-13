// src/server/modules/transfers/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type CreateTransferInput = {
    assetId: number;
    destHotelId: number;
    createdByUserId: number;
};

export type TransferWithRelations = Prisma.AssetTransferGetPayload<{
    include: {
        asset: {
            select: {
                id: true;
                serial: true;
                type: { select: { name: true } };
                brand: { select: { name: true } };
                model: { select: { name: true } };
            };
        };
        originHotel: { select: { id: true; name: true } };
        destHotel: { select: { id: true; name: true } };
    };
}>;

const transferInclude = {
    asset: {
        select: {
            id: true,
            serial: true,
            type: { select: { name: true } },
            brand: { select: { name: true } },
            model: { select: { name: true } },
        },
    },
    originHotel: { select: { id: true, name: true } },
    destHotel: { select: { id: true, name: true } },
} as const;

export const transfersService = {
    /**
     * Crear una nueva transferencia pendiente
     */
    async create(input: CreateTransferInput): Promise<TransferWithRelations> {
        const { assetId, destHotelId, createdByUserId } = input;

        // 1. Verificar que el asset existe y obtener su hotel actual
        const asset = await prisma.asset.findUnique({
            where: { id: assetId },
            select: { id: true, currentHotelId: true, status: true },
        });

        if (!asset) {
            throw { code: "NOT_FOUND", message: "Equipo no encontrado" };
        }

        if (!asset.currentHotelId) {
            throw { code: "BAD_REQUEST", message: "El equipo no tiene hotel asignado" };
        }

        if (asset.status === "TRANSFERENCIA_PENDIENTE") {
            throw { code: "CONFLICT", message: "Ya existe una transferencia pendiente para este equipo" };
        }

        if (asset.status === "BAJA") {
            throw { code: "BAD_REQUEST", message: "No se puede transferir un equipo dado de baja" };
        }

        // 2. Verificar que el hotel destino existe y está activo
        const destHotel = await prisma.hotel.findUnique({
            where: { id: destHotelId },
            select: { id: true, isActive: true },
        });

        if (!destHotel) {
            throw { code: "NOT_FOUND", message: "Hotel destino no encontrado" };
        }

        if (!destHotel.isActive) {
            throw { code: "BAD_REQUEST", message: "El hotel destino no está activo" };
        }

        if (asset.currentHotelId === destHotelId) {
            throw { code: "BAD_REQUEST", message: "El equipo ya pertenece a ese hotel" };
        }

        // 3. Verificar que no existe otra transferencia PENDING
        const existingPending = await prisma.assetTransfer.findFirst({
            where: { assetId, status: "PENDING" },
        });

        if (existingPending) {
            throw { code: "CONFLICT", message: "Ya existe una transferencia pendiente para este equipo" };
        }

        // 4. Crear transferencia y actualizar status del asset en transacción
        const transfer = await prisma.$transaction(async (tx) => {
            // Crear transferencia
            const created = await tx.assetTransfer.create({
                data: {
                    assetId,
                    originHotelId: asset.currentHotelId!,
                    destHotelId,
                    status: "PENDING",
                    createdByUserId,
                },
                include: transferInclude,
            });

            // Actualizar status del asset
            await tx.asset.update({
                where: { id: assetId },
                data: { status: "TRANSFERENCIA_PENDIENTE" },
            });

            return created;
        });

        return transfer;
    },

    /**
     * Confirmar una transferencia (solo el destino puede confirmar)
     */
    async confirm(
        transferId: number,
        acceptedByUserId: number
    ): Promise<TransferWithRelations> {
        const transfer = await prisma.assetTransfer.findUnique({
            where: { id: transferId },
            include: transferInclude,
        });

        if (!transfer) {
            throw { code: "NOT_FOUND", message: "Transferencia no encontrada" };
        }

        if (transfer.status !== "PENDING") {
            throw {
                code: "CONFLICT",
                message: `La transferencia ya está ${transfer.status === "COMPLETED" ? "completada" : "cancelada"}`,
            };
        }

        // Confirmar en transacción
        const updated = await prisma.$transaction(async (tx) => {
            // Actualizar transferencia
            const confirmed = await tx.assetTransfer.update({
                where: { id: transferId },
                data: {
                    status: "COMPLETED",
                    acceptedByUserId,
                    acceptedAt: new Date(),
                },
                include: transferInclude,
            });

            // Mover el asset al hotel destino y cambiar status a ALTA
            await tx.asset.update({
                where: { id: transfer.assetId },
                data: {
                    currentHotelId: transfer.destHotelId,
                    status: "ALTA",
                },
            });

            return confirmed;
        });

        return updated;
    },

    /**
     * Cancelar una transferencia (solo el origen puede cancelar)
     */
    async cancel(
        transferId: number,
        canceledByUserId: number
    ): Promise<TransferWithRelations> {
        const transfer = await prisma.assetTransfer.findUnique({
            where: { id: transferId },
            include: transferInclude,
        });

        if (!transfer) {
            throw { code: "NOT_FOUND", message: "Transferencia no encontrada" };
        }

        if (transfer.status !== "PENDING") {
            throw {
                code: "CONFLICT",
                message: `La transferencia ya está ${transfer.status === "COMPLETED" ? "completada" : "cancelada"}`,
            };
        }

        // Cancelar en transacción
        const updated = await prisma.$transaction(async (tx) => {
            // Actualizar transferencia
            const canceled = await tx.assetTransfer.update({
                where: { id: transferId },
                data: {
                    status: "CANCELED",
                    canceledByUserId,
                    canceledAt: new Date(),
                },
                include: transferInclude,
            });

            // Revertir el status del asset a ALTA
            await tx.asset.update({
                where: { id: transfer.assetId },
                data: { status: "ALTA" },
            });

            return canceled;
        });

        return updated;
    },

    /**
     * Listar transferencias pendientes
     * @param scope - "destination" para hoteles destino, "origin" para hoteles origen
     * @param hotelIds - IDs de hoteles del usuario
     */
    async listPending(
        scope: "destination" | "origin",
        hotelIds: number[]
    ): Promise<TransferWithRelations[]> {
        const where: Prisma.AssetTransferWhereInput = {
            status: "PENDING",
            ...(scope === "destination"
                ? { destHotelId: { in: hotelIds } }
                : { originHotelId: { in: hotelIds } }),
        };

        return prisma.assetTransfer.findMany({
            where,
            include: transferInclude,
            orderBy: { createdAt: "desc" },
        });
    },

    /**
     * Obtener una transferencia por ID
     */
    async getById(transferId: number): Promise<TransferWithRelations | null> {
        return prisma.assetTransfer.findUnique({
            where: { id: transferId },
            include: transferInclude,
        });
    },

    /**
     * Crear múltiples transferencias a partir de una lista de seriales
     * @returns Resultados detallados por cada serial
     */
    async createBulk(input: {
        serials: string[];
        destHotelId: number;
        createdByUserId: number;
        userHotelIds: number[];
        isAdmin: boolean;
    }): Promise<BulkTransferResult[]> {
        const { serials, destHotelId, createdByUserId, userHotelIds, isAdmin } = input;
        const results: BulkTransferResult[] = [];

        // Normalizar seriales (uppercase, trim, eliminar duplicados)
        const normalizedSerials = [...new Set(serials.map(s => s.trim().toUpperCase()).filter(s => s.length > 0))];

        if (normalizedSerials.length === 0) {
            return [];
        }

        // 1. Verificar que el hotel destino existe y está activo
        const destHotel = await prisma.hotel.findUnique({
            where: { id: destHotelId },
            select: { id: true, isActive: true },
        });

        if (!destHotel) {
            return normalizedSerials.map(serial => ({
                serial,
                assetId: null,
                success: false,
                error: "Hotel destino no encontrado",
            }));
        }

        if (!destHotel.isActive) {
            return normalizedSerials.map(serial => ({
                serial,
                assetId: null,
                success: false,
                error: "El hotel destino no está activo",
            }));
        }

        // 2. Buscar todos los assets por serial
        const assets = await prisma.asset.findMany({
            where: { serial: { in: normalizedSerials } },
            select: {
                id: true,
                serial: true,
                currentHotelId: true,
                status: true,
            },
        });

        const assetBySerial = new Map(assets.map(a => [a.serial, a]));

        // 3. Verificar transferencias pendientes existentes
        const assetIds = assets.map(a => a.id);
        const existingPending = await prisma.assetTransfer.findMany({
            where: {
                assetId: { in: assetIds },
                status: "PENDING",
            },
            select: { assetId: true },
        });
        const pendingAssetIds = new Set(existingPending.map(t => t.assetId));

        // 4. Procesar cada serial
        for (const serial of normalizedSerials) {
            const asset = assetBySerial.get(serial);

            if (!asset) {
                results.push({
                    serial,
                    assetId: null,
                    success: false,
                    error: "Equipo no encontrado",
                });
                continue;
            }

            if (!asset.currentHotelId) {
                results.push({
                    serial,
                    assetId: asset.id,
                    success: false,
                    error: "El equipo no tiene hotel asignado",
                });
                continue;
            }

            if (asset.status === "BAJA") {
                results.push({
                    serial,
                    assetId: asset.id,
                    success: false,
                    error: "El equipo está dado de baja",
                });
                continue;
            }

            if (asset.status === "TRANSFERENCIA_PENDIENTE" || pendingAssetIds.has(asset.id)) {
                results.push({
                    serial,
                    assetId: asset.id,
                    success: false,
                    error: "Ya tiene una transferencia pendiente",
                });
                continue;
            }

            if (asset.currentHotelId === destHotelId) {
                results.push({
                    serial,
                    assetId: asset.id,
                    success: false,
                    error: "El equipo ya pertenece a ese hotel",
                });
                continue;
            }

            // Verificar acceso al hotel origen (si no es admin)
            if (!isAdmin && !userHotelIds.includes(asset.currentHotelId)) {
                results.push({
                    serial,
                    assetId: asset.id,
                    success: false,
                    error: "No tienes acceso al hotel origen del equipo",
                });
                continue;
            }

            // Crear la transferencia
            try {
                const transfer = await prisma.$transaction(async (tx) => {
                    const created = await tx.assetTransfer.create({
                        data: {
                            assetId: asset.id,
                            originHotelId: asset.currentHotelId!,
                            destHotelId,
                            status: "PENDING",
                            createdByUserId,
                        },
                    });

                    await tx.asset.update({
                        where: { id: asset.id },
                        data: { status: "TRANSFERENCIA_PENDIENTE" },
                    });

                    return created;
                });

                results.push({
                    serial,
                    assetId: asset.id,
                    success: true,
                    transferId: transfer.id,
                });

                // Agregar a pendingAssetIds para evitar duplicados en la misma operación
                pendingAssetIds.add(asset.id);
            } catch (err: any) {
                results.push({
                    serial,
                    assetId: asset.id,
                    success: false,
                    error: err?.message ?? "Error al crear transferencia",
                });
            }
        }

        return results;
    },
};

export type BulkTransferResult = {
    serial: string;
    assetId: number | null;
    success: boolean;
    transferId?: number;
    error?: string;
};

export type BulkConfirmResult = {
    transferId: number;
    serial: string;
    success: boolean;
    error?: string;
};

/**
 * Confirmar múltiples transferencias a la vez
 */
export async function confirmBulk(input: {
    transferIds: number[];
    acceptedByUserId: number;
    userHotelIds: number[];
    isAdmin: boolean;
}): Promise<BulkConfirmResult[]> {
    const { transferIds, acceptedByUserId, userHotelIds, isAdmin } = input;
    const results: BulkConfirmResult[] = [];

    // Obtener todas las transferencias
    const transfers = await prisma.assetTransfer.findMany({
        where: { id: { in: transferIds } },
        include: {
            asset: { select: { serial: true } },
        },
    });

    const transferMap = new Map(transfers.map(t => [t.id, t]));

    for (const transferId of transferIds) {
        const transfer = transferMap.get(transferId);

        if (!transfer) {
            results.push({
                transferId,
                serial: "N/A",
                success: false,
                error: "Transferencia no encontrada",
            });
            continue;
        }

        // Verificar acceso al hotel destino (si no es admin)
        if (!isAdmin && !userHotelIds.includes(transfer.destHotelId)) {
            results.push({
                transferId,
                serial: transfer.asset.serial,
                success: false,
                error: "No tienes acceso al hotel destino",
            });
            continue;
        }

        if (transfer.status !== "PENDING") {
            results.push({
                transferId,
                serial: transfer.asset.serial,
                success: false,
                error: `La transferencia ya está ${transfer.status === "COMPLETED" ? "completada" : "cancelada"}`,
            });
            continue;
        }

        try {
            await prisma.$transaction(async (tx) => {
                await tx.assetTransfer.update({
                    where: { id: transferId },
                    data: {
                        status: "COMPLETED",
                        acceptedByUserId,
                        acceptedAt: new Date(),
                    },
                });

                await tx.asset.update({
                    where: { id: transfer.assetId },
                    data: {
                        currentHotelId: transfer.destHotelId,
                        status: "ALTA",
                    },
                });
            });

            results.push({
                transferId,
                serial: transfer.asset.serial,
                success: true,
            });
        } catch (err: any) {
            results.push({
                transferId,
                serial: transfer.asset.serial,
                success: false,
                error: err?.message ?? "Error al confirmar",
            });
        }
    }

    return results;
}
