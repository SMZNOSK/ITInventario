// src/app/(app)/admin/fix-loan-sync/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { RefreshCw, AlertCircle, CheckCircle2, XCircle, FileText } from "lucide-react";

interface FixDetail {
    loanId: number;
    collaboratorId: string;
    collaboratorName: string | null;
    deviceName: string | null;
    teamName: string | null;
    endDate: string;
    serial: string | null;
    assetFound: boolean;
    assetId?: number;
    previousStatus: string | null;
    newStatus: string | null;
    action: string;
}

interface FixReport {
    totalReturnedLoans: number;
    serialsExtracted: number;
    assetsFound: number;
    assetsFixed: number;
    assetsAlreadyOk: number;
    assetsNotFound: number;
    details: FixDetail[];
}

export default function FixLoanSyncPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<FixReport | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Redirect if not admin
    React.useEffect(() => {
        if (user && user.role !== "ADMIN") {
            router.push("/");
        }
    }, [user, router]);

    const handleFix = async () => {
        setLoading(true);
        setError(null);
        setReport(null);

        try {
            const res = await fetch("/api/admin/fix-loan-asset-sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Error al ejecutar la corrección");
            }

            setReport(data.report);
        } catch (err: any) {
            setError(err.message || "Error desconocido");
        } finally {
            setLoading(false);
        }
    };

    const getActionBadge = (action: string) => {
        switch (action) {
            case "fixed":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Corregido
                    </span>
                );
            case "already_ok":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Ya OK
                    </span>
                );
            case "serial_not_found":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-yellow-100 text-yellow-700 text-xs font-medium">
                        <AlertCircle className="w-3 h-3" />
                        Serial no encontrado
                    </span>
                );
            case "asset_not_found":
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-700 text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        Activo no encontrado
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                        {action}
                    </span>
                );
        }
    };

    if (!user || user.role !== "ADMIN") {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                Corrección de Sincronización: Préstamos y Activos
                            </h1>
                            <p className="text-gray-600">
                                Esta herramienta corrige activos que están marcados como ASIGNADO pero cuyos
                                préstamos ya fueron devueltos.
                            </p>
                        </div>
                        <RefreshCw className="w-8 h-8 text-indigo-600" />
                    </div>
                </div>

                {/* Description */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                    <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h2 className="font-semibold text-amber-900 mb-2">¿Qué hace esta herramienta?</h2>
                            <ul className="space-y-1 text-sm text-amber-800">
                                <li>• Encuentra todos los préstamos con fecha de devolución pasada (endDate &lt; hoy)</li>
                                <li>• Extrae el número de serie del equipo desde los campos del préstamo</li>
                                <li>• Busca el activo correspondiente en la base de datos</li>
                                <li>
                                    • Si el activo está en estado <code className="bg-amber-100 px-1 rounded">ASIGNADO</code>, lo
                                    actualiza a <code className="bg-amber-100 px-1 rounded">ALTA</code>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                    <button
                        onClick={handleFix}
                        disabled={loading}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
                    >
                        {loading ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Ejecutando corrección...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-5 h-5" />
                                Ejecutar Corrección
                            </>
                        )}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                        <div className="flex gap-3">
                            <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Report Summary */}
                {report && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">Préstamos Devueltos</span>
                                    <FileText className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-3xl font-bold text-gray-900">{report.totalReturnedLoans}</p>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">Activos Corregidos</span>
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                </div>
                                <p className="text-3xl font-bold text-green-600">{report.assetsFixed}</p>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-600">Activos No Encontrados</span>
                                    <XCircle className="w-5 h-5 text-red-500" />
                                </div>
                                <p className="text-3xl font-bold text-red-600">{report.assetsNotFound}</p>
                            </div>
                        </div>

                        {/* Detailed Report */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Detalle de Correcciones</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Total de {report.details.length} préstamos procesados
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Préstamo
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Colaborador
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Serial
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Estado Anterior
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Estado Nuevo
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Acción
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {report.details.map((detail, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    #{detail.loanId}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    <div>
                                                        <div className="font-medium">{detail.collaboratorName || "N/A"}</div>
                                                        <div className="text-xs text-gray-500">{detail.collaboratorId}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {detail.serial || (
                                                        <span className="text-gray-400 italic">No extraído</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {detail.previousStatus || (
                                                        <span className="text-gray-400 italic">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                    {detail.newStatus || (
                                                        <span className="text-gray-400 italic">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getActionBadge(detail.action)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
