// src/app/(app)/admin/check-asset-status/page.tsx
"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/providers";
import { Search, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

export default function CheckAssetStatusPage() {
    const { fetchJSON } = useAuth();
    const [serial, setSerial] = useState("POIUHGVB10");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheck = async () => {
        if (!serial.trim()) {
            setError("Debes proporcionar un serial");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const data = await fetchJSON("/api/admin/check-asset-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ serial: serial.trim() }),
            });

            setResult(data);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Error al verificar el estado del equipo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <header>
                <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
                    <Search className="w-7 h-7 text-indigo-600" />
                    Verificar Estado de Equipo
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Verifica si un equipo debería estar en ALTA y lo corrige automáticamente si no tiene asignaciones activas
                </p>
            </header>

            {/* Form */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Serial del Equipo
                        </label>
                        <input
                            type="text"
                            value={serial}
                            onChange={(e) => setSerial(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                            placeholder="Ej: POIUHGVB10"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={loading}
                        />
                    </div>

                    <button
                        onClick={handleCheck}
                        disabled={loading || !serial.trim()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Verificando...
                            </>
                        ) : (
                            <>
                                <Search className="w-4 h-4" />
                                Verificar Estado
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-900">❌ Error</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className="space-y-4">
                    {/* Asset Info */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Información del Equipo
                            </h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Serial</p>
                                    <p className="text-sm font-mono font-bold text-slate-900 mt-1">
                                        {result.results.asset.serial}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Estado Actual</p>
                                    <p className="text-sm mt-1">
                                        <span
                                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${result.results.asset.currentStatus === "ALTA"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : result.results.asset.currentStatus === "ASIGNADO"
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                        >
                                            {result.results.asset.currentStatus}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Tipo</p>
                                    <p className="text-sm text-slate-700 mt-1">{result.results.asset.type || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Marca</p>
                                    <p className="text-sm text-slate-700 mt-1">{result.results.asset.brand || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Modelo</p>
                                    <p className="text-sm text-slate-700 mt-1">{result.results.asset.model || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase">Hotel</p>
                                    <p className="text-sm text-slate-700 mt-1">{result.results.asset.hotel || "—"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analysis */}
                    <div
                        className={`rounded-xl border p-6 ${result.results.analysis.statusUpdated
                                ? "bg-emerald-50 border-emerald-200"
                                : result.results.analysis.needsStatusUpdate
                                    ? "bg-amber-50 border-amber-200"
                                    : "bg-blue-50 border-blue-200"
                            }`}
                    >
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">📊 Análisis</h3>
                        <div className="space-y-2 text-sm">
                            <p>
                                <strong>Asignaciones activas:</strong>{" "}
                                {result.results.activeAssignments.length > 0 ? (
                                    <span className="text-amber-800">
                                        {result.results.activeAssignments.length} encontrada(s)
                                    </span>
                                ) : (
                                    <span className="text-emerald-700">Ninguna ✓</span>
                                )}
                            </p>
                            <p>
                                <strong>Asignaciones manuales activas:</strong>{" "}
                                {result.results.activeManualAssignments.length > 0 ? (
                                    <span className="text-amber-800">
                                        {result.results.activeManualAssignments.length} encontrada(s)
                                    </span>
                                ) : (
                                    <span className="text-emerald-700">Ninguna ✓</span>
                                )}
                            </p>
                            <p>
                                <strong>Préstamos activos:</strong>{" "}
                                {result.results.activeLoans.length > 0 ? (
                                    <span className="text-amber-800">
                                        {result.results.activeLoans.length} encontrado(s)
                                    </span>
                                ) : (
                                    <span className="text-emerald-700">Ninguno ✓</span>
                                )}
                            </p>

                            <div className="mt-4 pt-4 border-t border-slate-200">
                                {result.results.analysis.statusUpdated ? (
                                    <div className="flex items-center gap-2 text-emerald-800">
                                        <CheckCircle className="w-5 h-5" />
                                        <strong>
                                            ✅ Estado corregido de ASIGNADO a ALTA
                                        </strong>
                                    </div>
                                ) : result.results.analysis.needsStatusUpdate ? (
                                    <div className="flex items-center gap-2 text-amber-800">
                                        <AlertTriangle className="w-5 h-5" />
                                        <strong>⚠️ Debería estar en ALTA pero está ASIGNADO</strong>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-blue-800">
                                        <CheckCircle className="w-5 h-5" />
                                        <strong>✓ Estado correcto</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active Assignments Details */}
                    {result.results.activeAssignments.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-amber-50 px-6 py-4 border-b border-amber-200">
                                <h2 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">
                                    Asignaciones Activas
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="space-y-3">
                                    {result.results.activeAssignments.map((a: any) => (
                                        <div key={a.id} className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                            <p className="text-sm">
                                                <strong>Colaborador:</strong> {a.collaboratorName} ({a.collaboratorId})
                                            </p>
                                            <p className="text-xs text-slate-600 mt-1">
                                                Asignado: {new Date(a.assignedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Loans Details */}
                    {result.results.activeLoans.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-amber-50 px-6 py-4 border-b border-amber-200">
                                <h2 className="text-sm font-semibold text-amber-900 uppercase tracking-wide">
                                    Préstamos Activos
                                </h2>
                            </div>
                            <div className="p-6">
                                <div className="space-y-3">
                                    {result.results.activeLoans.map((l: any) => (
                                        <div key={l.id} className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                            <p className="text-sm">
                                                <strong>Colaborador:</strong> {l.collaboratorName} ({l.collaboratorId})
                                            </p>
                                            <p className="text-xs text-slate-600 mt-1">
                                                Préstamo: {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
