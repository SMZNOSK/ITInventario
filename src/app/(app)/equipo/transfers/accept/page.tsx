// src/app/(app)/equipo/transfers/accept/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/providers";
import {
    CheckCircle,
    RefreshCw,
    ArrowRight,
    Inbox,
    CheckCheck,
    AlertCircle,
    Monitor,
    Users,
    Package,
    UserX,
    User,
    Building2,
    X,
} from "lucide-react";

// Types for Asset Transfers (Individual Equipment)
type PendingAssetTransfer = {
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

// Types for Assignment Transfers
type PendingAssignmentTransfer = {
    id: number;
    collaboratorId: string;
    collaboratorName: string;
    originHotel: { id: number; name: string };
    destHotel: { id: number; name: string };
    status: string;
    createdAt: string;
    equipmentCount: number;
    equipment: Array<{
        type: string | null;
        brand: string | null;
        model: string | null;
        serial: string | null;
    }>;
};

// Types for Loan Transfers
type PendingLoanTransfer = {
    id: number;
    collaboratorId: string;
    collaboratorName: string | null;
    originHotel: { id: number; name: string };
    destHotel: { id: number; name: string };
    status: string;
    createdAt: string;
    loanCount: number;
    equipment: Array<{
        type: string | null;
        brand: string | null;
        model: string | null;
        serial: string | null;
    }>;
};

// Types for Manual Assignment Transfers
type PendingManualAssignmentTransfer = {
    id: number;
    collaboratorKey: string;
    collaboratorName: string | null;
    originHotel: { id: number; name: string };
    destHotel: { id: number; name: string };
    status: string;
    createdAt: string;
    assignmentCount: number;
    equipment: Array<{
        type: string;
        brand: string;
        model: string;
        serial: string;
    }>;
};

type TabType = "assets" | "assignments" | "loans" | "manual";

export default function AcceptTransfersPage() {
    const { fetchJSON } = useAuth();

    const [activeTab, setActiveTab] = useState<TabType>("assets");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Asset transfers state
    const [assetTransfers, setAssetTransfers] = useState<PendingAssetTransfer[]>([]);
    const [confirmingAssetId, setConfirmingAssetId] = useState<number | null>(null);
    const [acceptingAllAssets, setAcceptingAllAssets] = useState(false);

    // Assignment transfers state
    const [assignmentTransfers, setAssignmentTransfers] = useState<PendingAssignmentTransfer[]>([]);
    const [acceptingAllAssignments, setAcceptingAllAssignments] = useState(false);

    // Loan transfers state
    const [loanTransfers, setLoanTransfers] = useState<PendingLoanTransfer[]>([]);
    const [acceptingAllLoans, setAcceptingAllLoans] = useState(false);

    // Manual assignment transfers state
    const [manualTransfers, setManualTransfers] = useState<PendingManualAssignmentTransfer[]>([]);
    const [viewingManualEquipmentId, setViewingManualEquipmentId] = useState<number | null>(null);
    const [acceptingAllManual, setAcceptingAllManual] = useState(false);

    // Load ALL pending transfers (for badges)
    const loadAllTransfers = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Load all transfer types in parallel
            const [assetsRes, assignmentsRes, loansRes, manualRes] = await Promise.all([
                fetchJSON<{ items: PendingAssetTransfer[] }>(
                    "/api/transfers/assets/pending?scope=destination"
                ),
                fetchJSON<{ items: PendingAssignmentTransfer[] }>(
                    "/api/assignments/transfers?type=received&status=PENDING"
                ),
                fetchJSON<{ items: PendingLoanTransfer[] }>(
                    "/api/loans/transfers?type=received&status=PENDING"
                ),
                fetchJSON<{ items: PendingManualAssignmentTransfer[] }>(
                    "/api/assignments/manual/transfers?type=received&status=PENDING"
                ),
            ]);

            setAssetTransfers(assetsRes.items ?? []);
            setAssignmentTransfers(assignmentsRes.items ?? []);
            setLoanTransfers(loansRes.items ?? []);
            setManualTransfers(manualRes.items ?? []);
        } catch (err: any) {
            console.error("Error cargando transferencias:", err);
            setError(err?.message ?? "Error al cargar transferencias");
        } finally {
            setLoading(false);
        }
    }, [fetchJSON]);

    // Load on mount and when manually refreshed
    useEffect(() => {
        loadAllTransfers();
    }, [loadAllTransfers]);

    // Asset transfer actions
    const handleConfirmAsset = async (transferId: number) => {
        if (!window.confirm("¿Confirmar esta transferencia? El equipo será asignado a tu hotel.")) return;

        setConfirmingAssetId(transferId);
        setError(null);
        setSuccess(null);

        try {
            await fetchJSON(`/api/transfers/assets/${transferId}/confirm`, { method: "POST" });
            setSuccess("✅ Transferencia confirmada. El equipo ahora pertenece a tu hotel.");
            await loadAllTransfers();
        } catch (err: any) {
            setError(err?.message ?? "Error al confirmar transferencia");
        } finally {
            setConfirmingAssetId(null);
        }
    };

    // Assignment transfer actions
    const handleAcceptAssignment = async (transferId: number) => {
        if (!window.confirm("¿Aceptar esta transferencia de asignaciones?")) return;

        try {
            setError(null);
            setSuccess(null);
            const response = await fetchJSON(`/api/assignments/transfers/${transferId}/accept`, {
                method: "POST",
            });
            setSuccess(response.message || "Transferencia aceptada exitosamente.");
            await loadAllTransfers();
        } catch (e: any) {
            setError(e?.message || "No se pudo aceptar la transferencia.");
        }
    };

    const handleRejectAssignment = async (transferId: number) => {
        if (!window.confirm("¿Rechazar esta transferencia de asignaciones?")) return;

        try {
            setError(null);
            setSuccess(null);
            const response = await fetchJSON(`/api/assignments/transfers/${transferId}/cancel`, {
                method: "POST",
            });
            setSuccess(response.message || "Transferencia rechazada exitosamente.");
            await loadAllTransfers();
        } catch (e: any) {
            setError(e?.message || "No se pudo rechazar la transferencia.");
        }
    };

    // Loan transfer actions
    const handleAcceptLoan = async (transferId: number) => {
        if (!window.confirm("¿Aceptar esta transferencia de préstamos?")) return;

        try {
            setError(null);
            setSuccess(null);
            const response = await fetchJSON(`/api/loans/transfers/${transferId}/accept`, {
                method: "POST",
            });
            setSuccess(response.message || "Transferencia aceptada exitosamente.");
            await loadAllTransfers();
        } catch (e: any) {
            setError(e?.message || "No se pudo aceptar la transferencia.");
        }
    };

    const handleRejectLoan = async (transferId: number) => {
        if (!window.confirm("¿Rechazar esta transferencia de préstamos?")) return;

        try {
            setError(null);
            setSuccess(null);
            const response = await fetchJSON(`/api/loans/transfers/${transferId}/cancel`, {
                method: "POST",
            });
            setSuccess(response.message || "Transferencia rechazada exitosamente.");
            await loadAllTransfers();
        } catch (e: any) {
            setError(e?.message || "No se pudo rechazar la transferencia.");
        }
    };

    // Manual assignment transfer actions
    const handleAcceptManual = async (transferId: number) => {
        if (!window.confirm("¿Aceptar esta transferencia de asignaciones manuales?")) return;

        try {
            setError(null);
            setSuccess(null);
            const response = await fetchJSON(`/api/assignments/manual/transfers/${transferId}/accept`, {
                method: "POST",
            });
            setSuccess(response.message || "Transferencia aceptada exitosamente.");
            await loadAllTransfers();
        } catch (e: any) {
            setError(e?.message || "No se pudo aceptar la transferencia.");
        }
    };

    const handleRejectManual = async (transferId: number) => {
        if (!window.confirm("¿Rechazar esta transferencia de asignaciones manuales?")) return;

        try {
            setError(null);
            setSuccess(null);
            const response = await fetchJSON(`/api/assignments/manual/transfers/${transferId}/cancel`, {
                method: "POST",
            });
            setSuccess(response.message || "Transferencia rechazada exitosamente.");
            await loadAllTransfers();
        } catch (e: any) {
            setError(e?.message || "No se pudo rechazar la transferencia.");
        }
    };

    // Bulk accept handlers
    const handleAcceptAllAssets = async () => {
        if (!window.confirm(`¿Confirmar TODAS las ${assetTransfers.length} transferencias de equipos?`)) return;

        setAcceptingAllAssets(true);
        setError(null);
        setSuccess(null);

        let successCount = 0;
        let errorCount = 0;

        for (const transfer of assetTransfers) {
            try {
                await fetchJSON(`/api/transfers/assets/${transfer.id}/confirm`, { method: "POST" });
                successCount++;
            } catch (err: any) {
                errorCount++;
                console.error(`Error confirmando transferencia ${transfer.id}:`, err);
            }
        }

        setAcceptingAllAssets(false);

        if (successCount > 0) {
            setSuccess(`✅ ${successCount} transferencia(s) confirmada(s) exitosamente.`);
        }
        if (errorCount > 0) {
            setError(`❌ ${errorCount} transferencia(s) no se pudieron confirmar.`);
        }

        await loadAllTransfers();
    };

    const handleAcceptAllAssignments = async () => {
        if (!window.confirm(`¿Aceptar TODAS las ${assignmentTransfers.length} transferencias de asignaciones?`)) return;

        setAcceptingAllAssignments(true);
        setError(null);
        setSuccess(null);

        let successCount = 0;
        let errorCount = 0;

        for (const transfer of assignmentTransfers) {
            try {
                await fetchJSON(`/api/assignments/transfers/${transfer.id}/accept`, { method: "POST" });
                successCount++;
            } catch (err: any) {
                errorCount++;
                console.error(`Error aceptando transferencia ${transfer.id}:`, err);
            }
        }

        setAcceptingAllAssignments(false);

        if (successCount > 0) {
            setSuccess(`✅ ${successCount} transferencia(s) aceptada(s) exitosamente.`);
        }
        if (errorCount > 0) {
            setError(`❌ ${errorCount} transferencia(s) no se pudieron aceptar.`);
        }

        await loadAllTransfers();
    };

    const handleAcceptAllLoans = async () => {
        if (!window.confirm(`¿Aceptar TODAS las ${loanTransfers.length} transferencias de préstamos?`)) return;

        setAcceptingAllLoans(true);
        setError(null);
        setSuccess(null);

        let successCount = 0;
        let errorCount = 0;

        for (const transfer of loanTransfers) {
            try {
                await fetchJSON(`/api/loans/transfers/${transfer.id}/accept`, { method: "POST" });
                successCount++;
            } catch (err: any) {
                errorCount++;
                console.error(`Error aceptando transferencia ${transfer.id}:`, err);
            }
        }

        setAcceptingAllLoans(false);

        if (successCount > 0) {
            setSuccess(`✅ ${successCount} transferencia(s) aceptada(s) exitosamente.`);
        }
        if (errorCount > 0) {
            setError(`❌ ${errorCount} transferencia(s) no se pudieron aceptar.`);
        }

        await loadAllTransfers();
    };

    const handleAcceptAllManual = async () => {
        if (!window.confirm(`¿Aceptar TODAS las ${manualTransfers.length} transferencias manuales?`)) return;

        setAcceptingAllManual(true);
        setError(null);
        setSuccess(null);

        let successCount = 0;
        let errorCount = 0;

        for (const transfer of manualTransfers) {
            try {
                await fetchJSON(`/api/assignments/manual/transfers/${transfer.id}/accept`, { method: "POST" });
                successCount++;
            } catch (err: any) {
                errorCount++;
                console.error(`Error aceptando transferencia ${transfer.id}:`, err);
            }
        }

        setAcceptingAllManual(false);

        if (successCount > 0) {
            setSuccess(`✅ ${successCount} transferencia(s) aceptada(s) exitosamente.`);
        }
        if (errorCount > 0) {
            setError(`❌ ${errorCount} transferencia(s) no se pudieron aceptar.`);
        }

        await loadAllTransfers();
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
                        <Inbox className="w-7 h-7 text-green-600" />
                        Aceptar Transferencias
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Revisa y acepta transferencias entre hoteles
                    </p>
                </div>

                <button
                    onClick={() => void loadAllTransfers()}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Actualizar
                </button>
            </header>

            {/* Tabs */}
            <div className="flex gap-3">
                <button
                    onClick={() => setActiveTab("assets")}
                    className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition ${activeTab === "assets"
                        ? "bg-white border-2 border-blue-500 text-blue-700 shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                >
                    <Monitor className="w-4 h-4" />
                    Equipos Individuales
                    {assetTransfers.length > 0 && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-600 border-2 border-white rounded-full">
                            {assetTransfers.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("assignments")}
                    className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition ${activeTab === "assignments"
                        ? "bg-white border-2 border-violet-500 text-violet-700 shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                >
                    <Users className="w-4 h-4" />
                    Asignaciones
                    {assignmentTransfers.length > 0 && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-violet-600 border-2 border-white rounded-full">
                            {assignmentTransfers.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("loans")}
                    className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition ${activeTab === "loans"
                        ? "bg-white border-2 border-emerald-500 text-emerald-700 shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                >
                    <Package className="w-4 h-4" />
                    Préstamos
                    {loanTransfers.length > 0 && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-emerald-600 border-2 border-white rounded-full">
                            {loanTransfers.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("manual")}
                    className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition ${activeTab === "manual"
                        ? "bg-white border-2 border-amber-500 text-amber-700 shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                >
                    <UserX className="w-4 h-4" />
                    Trans. sin Num.
                    {manualTransfers.length > 0 && (
                        <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-amber-600 border-2 border-white rounded-full">
                            {manualTransfers.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Messages */}
            {success && (
                <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {success}
                </div>
            )}
            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* Content based on active tab */}
            {activeTab === "assets" && (
                <AssetTransfersView
                    transfers={assetTransfers}
                    loading={loading}
                    confirmingId={confirmingAssetId}
                    acceptingAll={acceptingAllAssets}
                    onConfirm={handleConfirmAsset}
                    onAcceptAll={handleAcceptAllAssets}
                    formatDateTime={formatDateTime}
                />
            )}

            {activeTab === "assignments" && (
                <AssignmentTransfersView
                    transfers={assignmentTransfers}
                    loading={loading}
                    acceptingAll={acceptingAllAssignments}
                    onAccept={handleAcceptAssignment}
                    onAcceptAll={handleAcceptAllAssignments}
                    onReject={handleRejectAssignment}
                    formatDateTime={formatDateTime}
                />
            )}

            {activeTab === "loans" && (
                <LoanTransfersView
                    transfers={loanTransfers}
                    loading={loading}
                    acceptingAll={acceptingAllLoans}
                    onAccept={handleAcceptLoan}
                    onAcceptAll={handleAcceptAllLoans}
                    onReject={handleRejectLoan}
                    formatDateTime={formatDateTime}
                />
            )}

            {activeTab === "manual" && (
                <ManualAssignmentTransfersView
                    transfers={manualTransfers}
                    loading={loading}
                    acceptingAll={acceptingAllManual}
                    onAccept={handleAcceptManual}
                    onAcceptAll={handleAcceptAllManual}
                    onReject={handleRejectManual}
                    formatDateTime={formatDateTime}
                    viewingManualEquipmentId={viewingManualEquipmentId}
                    setViewingManualEquipmentId={setViewingManualEquipmentId}
                />
            )}
        </div>
    );
}

// Component for Asset Transfers
function AssetTransfersView({
    transfers,
    loading,
    confirmingId,
    acceptingAll,
    onConfirm,
    onAcceptAll,
    formatDateTime,
}: {
    transfers: PendingAssetTransfer[];
    loading: boolean;
    confirmingId: number | null;
    acceptingAll: boolean;
    onConfirm: (id: number) => void;
    onAcceptAll: () => void;
    formatDateTime: (date: string) => string;
}) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                <p className="mt-2 text-sm text-slate-500">Cargando transferencias...</p>
            </div>
        );
    }

    if (transfers.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Inbox className="w-16 h-16 text-slate-300 mx-auto" />
                <p className="mt-4 text-sm font-medium text-slate-700">No hay transferencias de equipos pendientes</p>
                <p className="mt-1 text-xs text-slate-500">
                    Las transferencias aparecerán aquí cuando sean enviadas a tus hoteles.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Accept All Button */}
            <div className="flex justify-end">
                <button
                    onClick={onAcceptAll}
                    disabled={acceptingAll || transfers.length === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {acceptingAll ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCheck className="w-5 h-5" />
                    )}
                    {acceptingAll ? `Aceptando ${transfers.length} transferencias...` : `Aceptar Todas (${transfers.length})`}
                </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
                                <td className="px-4 py-4 font-mono font-medium text-slate-800">{t.asset.serial}</td>
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
                                <td className="px-4 py-4 text-slate-500">{formatDateTime(t.createdAt)}</td>
                                <td className="px-4 py-4">
                                    <button
                                        onClick={() => onConfirm(t.id)}
                                        disabled={confirmingId === t.id}
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
            </div>
        </div>
    );
}

// Component for Assignment Transfers
function AssignmentTransfersView({
    transfers,
    loading,
    acceptingAll,
    onAccept,
    onAcceptAll,
    onReject,
    formatDateTime,
}: {
    transfers: PendingAssignmentTransfer[];
    loading: boolean;
    acceptingAll: boolean;
    onAccept: (id: number) => void;
    onAcceptAll: () => void;
    onReject: (id: number) => void;
    formatDateTime: (date: string) => string;
}) {
    const [viewingEquipmentId, setViewingEquipmentId] = React.useState<number | null>(null);
    const viewingTransfer = transfers.find((t) => t.id === viewingEquipmentId);
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                <p className="mt-2 text-sm text-slate-500">Cargando transferencias...</p>
            </div>
        );
    }

    if (transfers.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Inbox className="w-16 h-16 text-slate-300 mx-auto" />
                <p className="mt-4 text-sm font-medium text-slate-700">No hay transferencias de asignaciones pendientes</p>
                <p className="mt-1 text-xs text-slate-500">
                    Las transferencias aparecerán aquí cuando sean enviadas a tus hoteles.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Accept All Button */}
            <div className="flex justify-end">
                <button
                    onClick={onAcceptAll}
                    disabled={acceptingAll || transfers.length === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {acceptingAll ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCheck className="w-5 h-5" />
                    )}
                    {acceptingAll ? `Aceptando ${transfers.length} transferencias...` : `Aceptar Todas (${transfers.length})`}
                </button>
            </div>

            {transfers.map((transfer) => (
                <div
                    key={transfer.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
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
                                    <p className="text-xs font-medium text-slate-500 uppercase">Colaborador</p>
                                    <p className="text-sm font-semibold text-slate-800">{transfer.collaboratorName}</p>
                                    <p className="text-xs text-slate-500">ID: {transfer.collaboratorId}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase">Solicitado</p>
                                <p className="text-sm text-slate-700">{formatDateTime(transfer.createdAt)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-slate-500">
                                        {transfer.equipmentCount} equipo(s) incluidos
                                    </p>
                                    <button
                                        onClick={() => setViewingEquipmentId(transfer.id)}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium"
                                    >
                                        Ver equipos
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">
                        <button
                            onClick={() => onReject(transfer.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                            <X className="w-4 h-4" />
                            Rechazar
                        </button>
                        <button
                            onClick={() => onAccept(transfer.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Aceptar Transferencia
                        </button>
                    </div>
                </div>
            ))}

            {/* Equipment Details Modal */}
            {viewingTransfer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl">
                        {/* Header */}
                        <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Equipos Incluidos en la Transferencia
                            </h2>
                            <p className="mt-1 text-sm text-slate-600">
                                {viewingTransfer.collaboratorName} - {viewingTransfer.equipmentCount} equipo(s)
                            </p>
                        </div>

                        {/* Equipment Table */}
                        <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">TIPO</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">MARCA</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">MODELO</th>
                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">No.Serie</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {viewingTransfer.equipment.map((eq, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-800">{eq.type || '—'}</td>
                                            <td className="px-4 py-3 text-slate-700">{eq.brand || '—'}</td>
                                            <td className="px-4 py-3 text-slate-700">{eq.model || '—'}</td>
                                            <td className="px-4 py-3 font-mono text-slate-700">{eq.serial || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={() => setViewingEquipmentId(null)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    setViewingEquipmentId(null);
                                    onAccept(viewingTransfer.id);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Aceptar Transferencia
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Component for Loan Transfers
function LoanTransfersView({
    transfers,
    loading,
    acceptingAll,
    onAccept,
    onAcceptAll,
    onReject,
    formatDateTime,
}: {
    transfers: PendingLoanTransfer[];
    loading: boolean;
    acceptingAll: boolean;
    onAccept: (id: number) => void;
    onAcceptAll: () => void;
    onReject: (id: number) => void;
    formatDateTime: (date: string) => string;
}) {
    const [viewingEquipmentId, setViewingEquipmentId] = React.useState<number | null>(null);
    const viewingTransfer = transfers.find((t) => t.id === viewingEquipmentId);
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                <p className="mt-2 text-sm text-slate-500">Cargando transferencias...</p>
            </div>
        );
    }

    if (transfers.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Inbox className="w-16 h-16 text-slate-300 mx-auto" />
                <p className="mt-4 text-sm font-medium text-slate-700">No hay transferencias de préstamos pendientes</p>
                <p className="mt-1 text-xs text-slate-500">
                    Las transferencias aparecerán aquí cuando sean enviadas a tus hoteles.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Accept All Button */}
            <div className="flex justify-end">
                <button
                    onClick={onAcceptAll}
                    disabled={acceptingAll || transfers.length === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {acceptingAll ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCheck className="w-5 h-5" />
                    )}
                    {acceptingAll ? `Aceptando ${transfers.length} transferencias...` : `Aceptar Todas (${transfers.length})`}
                </button>
            </div>

            {transfers.map((transfer) => (
                <div
                    key={transfer.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
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
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                                    <User className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase">Colaborador</p>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {transfer.collaboratorName || "Sin nombre"}
                                    </p>
                                    <p className="text-xs text-slate-500">ID: {transfer.collaboratorId}</p>
                                </div>
                            </div>

                            <div><p className="text-xs font-medium text-slate-500 uppercase">Solicitado</p>
                                <p className="text-sm text-slate-700">{formatDateTime(transfer.createdAt)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-slate-500">
                                        {transfer.loanCount} préstamo(s) incluidos
                                    </p>
                                    <button
                                        onClick={() => setViewingEquipmentId(transfer.id)}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 underline font-medium"
                                    >
                                        Ver equipos
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">
                        <button
                            onClick={() => onReject(transfer.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                            <X className="w-4 h-4" />
                            Rechazar
                        </button>
                        <button
                            onClick={() => onAccept(transfer.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Aceptar Transferencia
                        </button>
                    </div>
                </div>
            ))
            }

            {/* Equipment Details Modal */}
            {
                viewingTransfer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                        <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl">
                            {/* Header */}
                            <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4">
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Equipos Incluidos en la Transferencia de Préstamos
                                </h2>
                                <p className="mt-1 text-sm text-slate-600">
                                    {viewingTransfer.collaboratorName} - {viewingTransfer.loanCount} préstamo(s)
                                </p>
                            </div>

                            {/* Equipment Table */}
                            <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-600">TIPO</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-600">MARCA</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-600">MODELO</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-600">No.Serie</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {viewingTransfer.equipment.map((eq, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 text-slate-800">{eq.type || '—'}</td>
                                                <td className="px-4 py-3 text-slate-700">{eq.brand || '—'}</td>
                                                <td className="px-4 py-3 text-slate-700">{eq.model || '—'}</td>
                                                <td className="px-4 py-3 font-mono text-slate-700">{eq.serial || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">
                                <button
                                    onClick={() => setViewingEquipmentId(null)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={() => {
                                        setViewingEquipmentId(null);
                                        onAccept(viewingTransfer.id);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Aceptar Transferencia
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// Component for Manual Assignment Transfers
function ManualAssignmentTransfersView({
    transfers,
    loading,
    acceptingAll,
    onAccept,
    onAcceptAll,
    onReject,
    formatDateTime,
    viewingManualEquipmentId,
    setViewingManualEquipmentId,
}: {
    transfers: PendingManualAssignmentTransfer[];
    loading: boolean;
    acceptingAll: boolean;
    onAccept: (id: number) => void;
    onAcceptAll: () => void;
    onReject: (id: number) => void;
    formatDateTime: (date: string) => string;
    viewingManualEquipmentId: number | null;
    setViewingManualEquipmentId: (id: number | null) => void;
}) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                <p className="mt-2 text-sm text-slate-500">Cargando transferencias...</p>
            </div>
        );
    }

    if (transfers.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Inbox className="w-16 h-16 text-slate-300 mx-auto" />
                <p className="mt-4 text-sm font-medium text-slate-700">
                    No hay transferencias de asignaciones manuales pendientes
                </p>
                <p className="mt-1 text-xs text-slate-500">
                    Las transferencias aparecerán aquí cuando sean enviadas a tus hoteles.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Accept All Button */}
            <div className="flex justify-end">
                <button
                    onClick={onAcceptAll}
                    disabled={acceptingAll || transfers.length === 0}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {acceptingAll ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCheck className="w-5 h-5" />
                    )}
                    {acceptingAll ? `Aceptando ${transfers.length} transferencias...` : `Aceptar Todas (${transfers.length})`}
                </button>
            </div>

            {transfers.map((transfer) => (
                <div
                    key={transfer.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
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
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                    <User className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase">Colaborador</p>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {transfer.collaboratorName || "Sin nombre"}
                                    </p>
                                    <p className="text-xs text-slate-500">Asignac

                                        iones manuales</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase">Solicitado</p>
                                <p className="text-sm text-slate-700">{formatDateTime(transfer.createdAt)}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-slate-500">
                                        {transfer.assignmentCount} asignación(es) incluidas
                                    </p>
                                    {transfer.equipment && transfer.equipment.length > 0 && (
                                        <button
                                            onClick={() => setViewingManualEquipmentId(transfer.id)}
                                            className="text-xs text-amber-600 hover:text-amber-700 font-medium underline"
                                        >
                                            Ver equipos
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">
                        <button
                            onClick={() => onReject(transfer.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                            <X className="w-4 h-4" />
                            Rechazar
                        </button>
                        <button
                            onClick={() => onAccept(transfer.id)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Aceptar Transferencia
                        </button>
                    </div>
                </div>
            ))}

            {/* Equipment Modal */}
            {viewingManualEquipmentId !== null && (() => {
                const transfer = transfers.find((t) => t.id === viewingManualEquipmentId);
                if (!transfer) return null;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                        <div className="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white shadow-xl">
                            <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-slate-200">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-800">
                                            Equipos en Transferencia
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-600">
                                            {transfer.assignmentCount} equipo(s) a transferir
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setViewingManualEquipmentId(null)}
                                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50 border-b-2 border-slate-200">
                                            <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                <th className="px-4 py-3 text-left">TIPO</th>
                                                <th className="px-4 py-3 text-left">MARCA</th>
                                                <th className="px-4 py-3 text-left">MODELO</th>
                                                <th className="px-4 py-3 text-left">No.Serie</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {transfer.equipment.map((equip, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-medium text-slate-800">{equip.type}</td>
                                                    <td className="px-4 py-3 text-slate-700">{equip.brand}</td>
                                                    <td className="px-4 py-3 text-slate-700">{equip.model}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{equip.serial}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
                                <button
                                    onClick={() => setViewingManualEquipmentId(null)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={() => {
                                        setViewingManualEquipmentId(null);
                                        onAccept(transfer.id);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Aceptar Transferencia
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
