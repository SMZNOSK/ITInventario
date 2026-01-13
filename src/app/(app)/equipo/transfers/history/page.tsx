// src/app/(app)/equipo/transfers/history/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/providers";
import { History, RefreshCw, ArrowRight, CheckCircle, XCircle, Filter, ChevronLeft, ChevronRight, Search, X } from "lucide-react";

type TransferHistory = {
    id: number;
    status: "COMPLETED" | "CANCELED";
    asset: {
        id: number;
        serial: string;
        type: string;
        brand: string;
        model: string;
    };
    originHotel: { id: number; name: string };
    destHotel: { id: number; name: string };
    createdAt: string;
    createdBy: { id: number; name: string } | null;
    acceptedAt: string | null;
    acceptedBy: { id: number; name: string } | null;
    canceledAt: string | null;
    canceledBy: { id: number; name: string } | null;
};

type StatusFilter = "all" | "COMPLETED" | "CANCELED";

const ITEMS_PER_PAGE = 20;

export default function TransferHistoryPage() {
    const { fetchJSON } = useAuth();

    const [transfers, setTransfers] = useState<TransferHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [createdByFilter, setCreatedByFilter] = useState("");
    const [acceptedByFilter, setAcceptedByFilter] = useState("");
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);

    // Cargar historial
    const loadHistory = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                status: statusFilter,
                limit: String(ITEMS_PER_PAGE),
                offset: String(offset),
            });
            if (createdByFilter.trim()) {
                params.set("createdBy", createdByFilter.trim());
            }
            if (acceptedByFilter.trim()) {
                params.set("acceptedBy", acceptedByFilter.trim());
            }
            const res = await fetchJSON<{
                items: TransferHistory[];
                total: number;
            }>(`/api/transfers/assets/history?${params}`);
            setTransfers(res.items ?? []);
            setTotal(res.total ?? 0);
        } catch (err: any) {
            console.error("Error cargando historial:", err);
            setError(err?.message ?? "Error al cargar historial");
        } finally {
            setLoading(false);
        }
    }, [fetchJSON, statusFilter, createdByFilter, acceptedByFilter, offset]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // Reset offset when filters change
    useEffect(() => {
        setOffset(0);
    }, [statusFilter, createdByFilter, acceptedByFilter]);

    // Formatear fecha y hora
    function formatDateTime(dateStr: string | null) {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    // Limpiar filtros
    function clearFilters() {
        setStatusFilter("all");
        setCreatedByFilter("");
        setAcceptedByFilter("");
    }

    const currentPage = Math.floor(offset / ITEMS_PER_PAGE) + 1;
    const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
    const hasActiveFilters = statusFilter !== "all" || createdByFilter.trim() || acceptedByFilter.trim();

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
                        <History className="w-7 h-7 text-purple-600" />
                        Historial de Transferencias
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Registro de todas las transferencias completadas y canceladas.
                    </p>
                </div>

                <button
                    onClick={loadHistory}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Actualizar
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                {/* Filtro de estado */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Filter className="w-4 h-4" />
                        <span className="font-medium">Estado:</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatusFilter("all")}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === "all"
                                    ? "bg-slate-800 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setStatusFilter("COMPLETED")}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === "COMPLETED"
                                    ? "bg-blue-600 text-white"
                                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                }`}
                        >
                            <CheckCircle className="w-4 h-4" />
                            Completadas
                        </button>
                        <button
                            onClick={() => setStatusFilter("CANCELED")}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === "CANCELED"
                                    ? "bg-red-600 text-white"
                                    : "bg-red-50 text-red-700 hover:bg-red-100"
                                }`}
                        >
                            <XCircle className="w-4 h-4" />
                            Canceladas
                        </button>
                    </div>
                </div>

                {/* Filtros de búsqueda por usuario */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Search className="w-4 h-4" />
                        <span className="font-medium">Buscar por usuario:</span>
                    </div>
                    <div className="flex gap-3 flex-1">
                        <div className="relative flex-1 max-w-xs">
                            <input
                                type="text"
                                placeholder="Nombre de quien envió..."
                                value={createdByFilter}
                                onChange={(e) => setCreatedByFilter(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                            {createdByFilter && (
                                <button
                                    onClick={() => setCreatedByFilter("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="relative flex-1 max-w-xs">
                            <input
                                type="text"
                                placeholder="Nombre de quien aceptó/canceló..."
                                value={acceptedByFilter}
                                onChange={(e) => setAcceptedByFilter(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                            {acceptedByFilter && (
                                <button
                                    onClick={() => setAcceptedByFilter("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-sm text-slate-500 hover:text-slate-700 underline"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>

                {/* Contador */}
                <div className="text-sm text-slate-500 pt-2 border-t border-slate-100">
                    {total} {total === 1 ? "registro encontrado" : "registros encontrados"}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                </div>
            )}

            {/* Tabla */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                        <p className="mt-2 text-sm text-slate-500">Cargando historial...</p>
                    </div>
                ) : transfers.length === 0 ? (
                    <div className="p-12 text-center">
                        <History className="w-12 h-12 text-slate-300 mx-auto" />
                        <h3 className="mt-4 text-lg font-medium text-slate-600">Sin registros</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            No hay transferencias que coincidan con los filtros seleccionados.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Estado</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Serial</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Equipo</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Transferencia</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Enviado por</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Fecha Envío</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Aceptado/Cancelado por</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Fecha Resolución</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {transfers.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-4">
                                            {t.status === "COMPLETED" ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Completada
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    <XCircle className="w-3 h-3" />
                                                    Cancelada
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 font-mono font-medium text-slate-800">
                                            {t.asset.serial}
                                        </td>
                                        <td className="px-4 py-4 text-slate-600">
                                            <div className="text-xs text-slate-400">{t.asset.type}</div>
                                            <div>{t.asset.brand} {t.asset.model}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-slate-500">{t.originHotel.name}</span>
                                                <ArrowRight className="w-4 h-4 text-blue-500" />
                                                <span className="font-medium text-blue-700">{t.destHotel.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-slate-800 font-medium">
                                                {t.createdBy?.name ?? "-"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 text-xs">
                                            {formatDateTime(t.createdAt)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-slate-800 font-medium">
                                                {t.status === "COMPLETED"
                                                    ? t.acceptedBy?.name ?? "-"
                                                    : t.canceledBy?.name ?? "-"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 text-xs">
                                            {t.status === "COMPLETED"
                                                ? formatDateTime(t.acceptedAt)
                                                : formatDateTime(t.canceledAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginación */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                        <div className="text-sm text-slate-500">
                            Mostrando {offset + 1} - {Math.min(offset + ITEMS_PER_PAGE, total)} de {total}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setOffset(Math.max(0, offset - ITEMS_PER_PAGE))}
                                disabled={offset === 0}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Anterior
                            </button>
                            <span className="flex items-center px-3 text-sm text-slate-600">
                                Página {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={() => setOffset(offset + ITEMS_PER_PAGE)}
                                disabled={offset + ITEMS_PER_PAGE >= total}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
