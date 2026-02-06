// src/app/(app)/admin/fix-loan-returndate/page.tsx
"use client";

import React, { useState } from "react";
import { useAuth } from "@/app/providers";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

export default function FixLoanReturnDatePage() {
    const { fetchJSON } = useAuth();
    const [collaboratorId, setCollaboratorId] = useState("391162");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFix = async () => {
        if (!collaboratorId.trim()) {
            setError("Debes proporcionar un ID de colaborador");
            return;
        }

        const confirmed = window.confirm(
            `¿Estás seguro de que deseas resetear los returnDate de los préstamos del colaborador ${collaboratorId}?\n\n` +
            `Esto hará que los préstamos vuelvan a aparecer como ACTIVOS y se muestre el botón "Marcar devuelto".`
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const data = await fetchJSON("/api/admin/fix-loan-returndate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ collaboratorId }),
            });

            setResult(data);
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "Error al ejecutar el fix");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <header>
                <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
                    <AlertTriangle className="w-7 h-7 text-amber-600" />
                    Fix: Resetear returnDate de Préstamos
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Herramienta administrativa para corregir préstamos que aparecen como "Devueltos"
                    pero sus activos siguen en estado ASIGNADO.
                </p>
            </header>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ ¿Qué hace esta herramienta?</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Busca préstamos del colaborador que tengan <code className="bg-blue-100 px-1 rounded">returnDate</code> establecido</li>
                    <li>Verifica si el activo asociado sigue en estado <code className="bg-blue-100 px-1 rounded">ASIGNADO</code></li>
                    <li>Si el activo está ASIGNADO, resetea el <code className="bg-blue-100 px-1 rounded">returnDate</code> a <code className="bg-blue-100 px-1 rounded">NULL</code></li>
                    <li>Esto hace que el préstamo vuelva a aparecer como "Activo" con el botón verde "Marcar devuelto"</li>
                </ul>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            ID del Colaborador
                        </label>
                        <input
                            type="text"
                            value={collaboratorId}
                            onChange={(e) => setCollaboratorId(e.target.value)}
                            placeholder="Ej: 391162"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={loading}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Ingresa el ID del colaborador cuyos préstamos deseas corregir
                        </p>
                    </div>

                    <button
                        onClick={handleFix}
                        disabled={loading || !collaboratorId.trim()}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Ejecutando fix...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Ejecutar Fix
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
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-slate-200">
                        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                            ✅ Resultados del Fix
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="text-xs text-slate-500 uppercase">Préstamos Verificados</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">
                                    {result.results?.loansChecked || 0}
                                </p>
                            </div>
                            <div className="bg-emerald-50 rounded-lg p-4">
                                <p className="text-xs text-emerald-600 uppercase">Préstamos Corregidos</p>
                                <p className="text-2xl font-bold text-emerald-900 mt-1">
                                    {result.results?.loansFixed || 0}
                                </p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4">
                                <p className="text-xs text-blue-600 uppercase">Sin Cambios</p>
                                <p className="text-2xl font-bold text-blue-900 mt-1">
                                    {(result.results?.loansChecked || 0) - (result.results?.loansFixed || 0)}
                                </p>
                            </div>
                        </div>

                        {result.results?.details && result.results.details.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">Detalles por Préstamo</h3>
                                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                                                <th className="px-4 py-2 text-left">Loan ID</th>
                                                <th className="px-4 py-2 text-left">Serial</th>
                                                <th className="px-4 py-2 text-left">Estado Asset</th>
                                                <th className="px-4 py-2 text-left">Mensaje</th>
                                                <th className="px-4 py-2 text-center">Corregido</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {result.results.details.map((detail: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono text-slate-700">{detail.loanId}</td>
                                                    <td className="px-4 py-3 font-mono text-slate-700">{detail.serial || "—"}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${detail.assetStatus === "ASIGNADO"
                                                                ? "bg-amber-100 text-amber-800"
                                                                : detail.assetStatus === "ALTA"
                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                    : "bg-slate-100 text-slate-600"
                                                            }`}>
                                                            {detail.assetStatus || "—"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">{detail.message}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {detail.fixed ? (
                                                            <CheckCircle className="w-4 h-4 text-emerald-600 mx-auto" />
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <p className="text-xs text-amber-800">
                                <strong>Siguiente paso:</strong> Visita la página de préstamos del colaborador para verificar
                                que los equipos ahora aparecen como "Activos" con el botón "Marcar devuelto" disponible.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
