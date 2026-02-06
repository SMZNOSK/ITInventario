// src/app/(app)/equipo/loans/transfers/accept/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/providers";
import {
    CheckCircle,
    RefreshCw,
    ArrowRight,
    Inbox,
    User,
    Building2,
    X,
    AlertCircle,
} from "lucide-react";

type PendingLoanTransfer = {
    id: number;
    collaboratorId: string;
    collaboratorName: string | null;
    originHotel: { id: number; name: string };
    destHotel: { id: number; name: string };
    status: string;
    createdAt: string;
    loanCount: number;
};

export default function AcceptLoanTransfersPage() {
    const { fetchJSON } = useAuth();

    const [transfers, setTransfers] = useState<PendingLoanTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadPendingTransfers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await fetchJSON("/api/loans/transfers?type=received&status=PENDING");
            setTransfers(data.items ?? []);
        } catch (e: any) {
            console.error(e);
            setError(e?.message ?? "No se pudieron cargar las transferencias pendientes.");
            setTransfers([]);
        } finally {
            setLoading(false);
        }
    }, [fetchJSON]);

    useEffect(() => {
        void loadPendingTransfers();
    }, [loadPendingTransfers]);

    const handleAccept = async (transferId: number) => {
        if (!window.confirm("¿Aceptar esta transferencia de préstamos?")) return;

        try {
            setError(null);
            const response = await fetchJSON(`/api/loans/transfers/${transferId}/accept`, {
                method: "POST",
            });

            alert(response.message || "Transferencia aceptada exitosamente.");
            await loadPendingTransfers();
        } catch (e: any) {
            console.error(e);
            setError(e?.message || "No se pudo aceptar la transferencia.");
        }
    };

    const handleReject = async (transferId: number) => {
        if (!window.confirm("¿Rechazar esta transferencia de préstamos?")) return;

        try {
            setError(null);
            const response = await fetchJSON(`/api/loans/transfers/${transferId}/cancel`, {
                method: "POST",
            });

            alert(response.message || "Transferencia rechazada exitosamente.");
            await loadPendingTransfers();
        } catch (e: any) {
            console.error(e);
            setError(e?.message || "No se pudo rechazar la transferencia.");
        }
    };

    const formatDateTime = (dateStr: string): string => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
                        <Inbox className="w-7 h-7 text-violet-600" />
                        Aceptar Transferencias de Préstamos
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Revisa y acepta transferencias de préstamos entre hoteles
                    </p>
                </div>

                <button
                    onClick={() => void loadPendingTransfers()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refrescar
                </button>
            </header>

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                    <p className="mt-2 text-sm text-slate-500">Cargando transferencias...</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && transfers.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Inbox className="w-16 h-16 text-slate-300 mx-auto" />
                    <p className="mt-4 text-sm font-medium text-slate-700">
                        No hay transferencias de préstamos pendientes
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Las transferencias aparecerán aquí cuando sean enviadas a tus hoteles.
                    </p>
                </div>
            )}

            {/* Transfers List */}
            {!loading && transfers.length > 0 && (
                <div className="space-y-4">
                    {transfers.map((transfer) => (
                        <div
                            key={transfer.id}
                            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                        >
                            {/* Card Content */}
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                                        PENDIENTE
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
                                    <span className="font-medium">De:</span>
                                    <Building2 className="w-4 h-4" />
                                    {transfer.originHotel.name}
                                    <ArrowRight className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">A:</span>
                                    <Building2 className="w-4 h-4" />
                                    {transfer.destHotel.name}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                                            <User className="w-5 h-5 text-violet-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 uppercase">
                                                Colaborador
                                            </p>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {transfer.collaboratorName || "Sin nombre"}
                                            </p>
                                            <p className="text-xs text-slate-500">ID: {transfer.collaboratorId}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase">
                                            Solicitado
                                        </p>
                                        <p className="text-sm text-slate-700">
                                            {formatDateTime(transfer.createdAt)}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {transfer.loanCount} préstamo(s) incluidos
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">
                                <button
                                    onClick={() => handleReject(transfer.id)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                                >
                                    <X className="w-4 h-4" />
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => handleAccept(transfer.id)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Aceptar Transferencia
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
