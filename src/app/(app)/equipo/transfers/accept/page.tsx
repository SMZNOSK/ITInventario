// src/app/(app)/equipo/transfers/accept/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/providers";
import { CheckCircle, RefreshCw, ArrowRight, Inbox, CheckCheck, AlertCircle } from "lucide-react";

type PendingTransfer = {
    id: number;
    assetId: number;
    asset: {
        serial: string;
        type: string;
        brand: string;
        model: string;
    };
    originHotel: { id: number; name: string };
    destHotel: { id: number; name: string };
    status: string;
    createdAt: string;
};

type BulkConfirmResult = {
    transferId: number;
    serial: string;
    success: boolean;
    error?: string;
};

export default function AcceptTransfersPage() {
    const { fetchJSON } = useAuth();

    const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [bulkConfirming, setBulkConfirming] = useState(false);
    const [bulkResults, setBulkResults] = useState<BulkConfirmResult[] | null>(null);

    // Cargar transferencias pendientes dirigidas a mis hoteles
    const loadPending = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchJSON<{ items: PendingTransfer[] }>(
                "/api/transfers/assets/pending?scope=destination"
            );
            setTransfers(res.items ?? []);
        } catch (err: any) {
            console.error("Error cargando transferencias:", err);
            setError(err?.message ?? "Error al cargar transferencias");
        } finally {
            setLoading(false);
        }
    }, [fetchJSON]);

    useEffect(() => {
        loadPending();
    }, [loadPending]);

    // Confirmar transferencia individual
    async function handleConfirm(transferId: number) {
        if (!window.confirm("¿Confirmar esta transferencia? El equipo será asignado a tu hotel."))
            return;

        setConfirmingId(transferId);
        setError(null);
        setSuccess(null);
        setBulkResults(null);

        try {
            await fetchJSON(`/api/transfers/assets/${transferId}/confirm`, {
                method: "POST",
            });

            setSuccess("✅ Transferencia confirmada. El equipo ahora pertenece a tu hotel.");
            loadPending();
        } catch (err: any) {
            setError(err?.message ?? "Error al confirmar transferencia");
        } finally {
            setConfirmingId(null);
        }
    }

    // Confirmar TODAS las transferencias
    async function handleConfirmAll() {
        if (transfers.length === 0) return;

        const count = transfers.length;
        if (!window.confirm(`¿Confirmar las ${count} transferencias pendientes? Todos los equipos serán asignados a tus hoteles.`))
            return;

        setBulkConfirming(true);
        setError(null);
        setSuccess(null);
        setBulkResults(null);

        try {
            const transferIds = transfers.map(t => t.id);
            const res = await fetchJSON<{
                ok: boolean;
                results: BulkConfirmResult[];
                successCount: number;
                errorCount: number;
            }>("/api/transfers/assets/bulk-confirm", {
                method: "POST",
                body: JSON.stringify({ transferIds }),
            });

            setBulkResults(res.results);

            if (res.successCount > 0) {
                setSuccess(`✅ ${res.successCount} transferencia(s) confirmada(s) correctamente.`);
                loadPending();
            }

            if (res.errorCount > 0 && res.successCount === 0) {
                setError(`❌ No se pudo confirmar ninguna transferencia. Revisa los detalles abajo.`);
            }
        } catch (err: any) {
            setError(err?.message ?? "Error al confirmar transferencias");
        } finally {
            setBulkConfirming(false);
        }
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
                        <Inbox className="w-7 h-7 text-green-600" />
                        Aceptar Transferencias
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Equipos que otros hoteles quieren transferir a tus hoteles asignados.
                    </p>
                </div>

                <div className="flex gap-2">
                    {/* Botón Aceptar Todas */}
                    {transfers.length > 0 && (
                        <button
                            onClick={handleConfirmAll}
                            disabled={bulkConfirming || loading}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {bulkConfirming ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCheck className="w-4 h-4" />
                            )}
                            Aceptar Todas ({transfers.length})
                        </button>
                    )}

                    <button
                        onClick={loadPending}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Mensajes */}
            {success && (
                <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    {success}
                </div>
            )}
            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Resultados de confirmación masiva */}
            {bulkResults && bulkResults.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                        Resultados de la Confirmación
                    </h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Serial</th>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Estado</th>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {bulkResults.map((result, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono">{result.serial}</td>
                                        <td className="px-4 py-3">
                                            {result.success ? (
                                                <span className="inline-flex items-center gap-1 text-green-700">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Confirmada
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-red-600">
                                                    <AlertCircle className="w-4 h-4" />
                                                    Error
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">
                                            {result.success
                                                ? "Equipo recibido correctamente"
                                                : result.error}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-3 flex gap-4 text-sm">
                        <span className="text-green-700">
                            ✓ {bulkResults.filter((r) => r.success).length} confirmada(s)
                        </span>
                        <span className="text-red-600">
                            ✗ {bulkResults.filter((r) => !r.success).length} con error
                        </span>
                    </div>
                </div>
            )}

            {/* Tabla de transferencias */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                        <p className="mt-2 text-sm text-slate-500">Cargando transferencias...</p>
                    </div>
                ) : transfers.length === 0 ? (
                    <div className="p-12 text-center">
                        <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
                        <h3 className="mt-4 text-lg font-medium text-slate-600">Sin transferencias pendientes</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            No hay equipos esperando ser recibidos en tus hoteles.
                        </p>
                    </div>
                ) : (
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Serial</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Tipo</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Equipo</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Transferencia</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Fecha</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transfers.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-4 font-mono font-medium text-slate-800">
                                        {t.asset.serial}
                                    </td>
                                    <td className="px-4 py-4 text-slate-600">{t.asset.type}</td>
                                    <td className="px-4 py-4 text-slate-600">
                                        {t.asset.brand} {t.asset.model}
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-500">{t.originHotel.name}</span>
                                            <ArrowRight className="w-4 h-4 text-blue-500" />
                                            <span className="font-medium text-blue-700">{t.destHotel.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-slate-500">
                                        {new Date(t.createdAt).toLocaleDateString("es-MX", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td className="px-4 py-4">
                                        <button
                                            onClick={() => handleConfirm(t.id)}
                                            disabled={confirmingId === t.id || bulkConfirming}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {confirmingId === t.id ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="w-4 h-4" />
                                            )}
                                            Confirmar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-1">ℹ️ ¿Cómo funciona?</h3>
                <p className="text-sm text-blue-700">
                    Cuando otro hotel envía un equipo a uno de tus hoteles asignados, aparece aquí para que lo confirmes.
                    Al confirmar, el equipo cambia de hotel y queda disponible en tu inventario.
                    Usa el botón "Aceptar Todas" para confirmar múltiples transferencias de una sola vez.
                </p>
            </div>
        </div>
    );
}
