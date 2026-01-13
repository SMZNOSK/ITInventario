// src/app/(app)/equipo/transfers/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/app/providers";
import { ArrowRight, X, Send, RefreshCw, Package, Monitor, Layers, CheckCircle, AlertCircle, Info } from "lucide-react";

type Asset = {
    id: number;
    serial: string;
    type: { name: string };
    brand: { name: string };
    model: { name: string };
    currentHotelId: number | null;
    currentHotel?: { id: number; name: string } | null;
    status: string;
};

type Hotel = {
    id: number;
    name: string;
    active: boolean;
};

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

type BulkTransferResult = {
    serial: string;
    assetId: number | null;
    success: boolean;
    transferId?: number;
    error?: string;
};

type TransferMode = "individual" | "multiple";

export default function TransfersPage() {
    const { fetchJSON, user } = useAuth();

    // Tab mode
    const [mode, setMode] = useState<TransferMode>("individual");

    // Estados para buscar asset (individual)
    const [serialInput, setSerialInput] = useState("");
    const [searchedAsset, setSearchedAsset] = useState<Asset | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Estados para transferencia múltiple
    const [bulkSerials, setBulkSerials] = useState("");
    const [bulkDestHotelId, setBulkDestHotelId] = useState<number | null>(null);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkResults, setBulkResults] = useState<BulkTransferResult[] | null>(null);

    // Estados para transferencia
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [destHotelId, setDestHotelId] = useState<number | null>(null);
    const [transferLoading, setTransferLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Transferencias pendientes (iniciadas por mí)
    const [myPending, setMyPending] = useState<PendingTransfer[]>([]);
    const [pendingLoading, setPendingLoading] = useState(false);

    // Cargar hoteles activos
    const loadHotels = useCallback(async () => {
        try {
            const res = await fetchJSON<{ items: Hotel[] }>("/api/hotels/active");
            setHotels(res.items ?? []);
        } catch (err) {
            console.error("Error cargando hoteles:", err);
        }
    }, [fetchJSON]);

    // Cargar transferencias pendientes iniciadas por mí
    const loadMyPending = useCallback(async () => {
        setPendingLoading(true);
        try {
            const res = await fetchJSON<{ items: PendingTransfer[] }>(
                "/api/transfers/assets/pending?scope=origin"
            );
            setMyPending(res.items ?? []);
        } catch (err) {
            console.error("Error cargando pendientes:", err);
        } finally {
            setPendingLoading(false);
        }
    }, [fetchJSON]);

    useEffect(() => {
        loadHotels();
        loadMyPending();
    }, [loadHotels, loadMyPending]);

    // Reset messages on mode change
    useEffect(() => {
        setSuccess(null);
        setError(null);
        setBulkResults(null);
    }, [mode]);

    // Buscar asset por serial (individual)
    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        setSearchError(null);
        setSearchedAsset(null);
        setSuccess(null);
        setError(null);

        const serial = serialInput.trim().toUpperCase();
        if (!serial) {
            setSearchError("Ingresa un número de serie");
            return;
        }

        setSearchLoading(true);
        try {
            const res = await fetchJSON<{ ok: boolean; asset: Asset; error?: string }>(
                `/api/transfers/assets/search?serial=${encodeURIComponent(serial)}`
            );
            if (!res.asset) {
                setSearchError("Equipo no encontrado");
                return;
            }
            setSearchedAsset(res.asset);
            setDestHotelId(null);
        } catch (err: any) {
            setSearchError(err?.message ?? "Error buscando equipo");
        } finally {
            setSearchLoading(false);
        }
    }

    // Iniciar transferencia individual
    async function handleTransfer() {
        if (!searchedAsset || !destHotelId) return;

        setTransferLoading(true);
        setError(null);
        setSuccess(null);

        try {
            await fetchJSON("/api/transfers/assets", {
                method: "POST",
                body: JSON.stringify({
                    assetId: searchedAsset.id,
                    destHotelId,
                }),
            });

            setSuccess(`✅ Transferencia iniciada. El equipo ahora está en "Transferencia Pendiente".`);
            setSearchedAsset(null);
            setSerialInput("");
            setDestHotelId(null);
            loadMyPending();
        } catch (err: any) {
            setError(err?.message ?? "Error al iniciar transferencia");
        } finally {
            setTransferLoading(false);
        }
    }

    // Transferencia múltiple
    async function handleBulkTransfer() {
        if (!bulkDestHotelId) {
            setError("Selecciona un hotel destino");
            return;
        }

        const serials = bulkSerials
            .split("\n")
            .map((s) => s.trim().toUpperCase())
            .filter((s) => s.length > 0);

        if (serials.length === 0) {
            setError("Ingresa al menos un número de serie");
            return;
        }

        if (serials.length > 100) {
            setError("Máximo 100 seriales por operación");
            return;
        }

        setBulkLoading(true);
        setError(null);
        setSuccess(null);
        setBulkResults(null);

        try {
            const res = await fetchJSON<{
                ok: boolean;
                results: BulkTransferResult[];
                successCount: number;
                errorCount: number;
            }>("/api/transfers/assets/bulk", {
                method: "POST",
                body: JSON.stringify({
                    serials,
                    destHotelId: bulkDestHotelId,
                }),
            });

            setBulkResults(res.results);

            if (res.successCount > 0) {
                setSuccess(`✅ ${res.successCount} transferencia(s) iniciada(s) correctamente.`);
                loadMyPending();
            }

            if (res.errorCount > 0 && res.successCount === 0) {
                setError(`❌ No se pudo transferir ningún equipo. Revisa los detalles abajo.`);
            }
        } catch (err: any) {
            setError(err?.message ?? "Error al procesar transferencias");
        } finally {
            setBulkLoading(false);
        }
    }

    // Cancelar transferencia
    async function handleCancel(transferId: number) {
        if (!window.confirm("¿Seguro que quieres cancelar esta transferencia?")) return;

        try {
            await fetchJSON(`/api/transfers/assets/${transferId}/cancel`, {
                method: "POST",
            });
            setSuccess("✅ Transferencia cancelada");
            loadMyPending();
        } catch (err: any) {
            setError(err?.message ?? "Error al cancelar");
        }
    }

    // Limpiar formulario múltiple
    function handleClearBulk() {
        setBulkSerials("");
        setBulkDestHotelId(null);
        setBulkResults(null);
        setSuccess(null);
        setError(null);
    }

    // Filtrar hoteles para no mostrar el hotel actual del asset
    const availableHotels = hotels.filter(
        (h) => searchedAsset && h.id !== searchedAsset.currentHotelId
    );

    // Contar líneas en bulk textarea
    const serialCount = bulkSerials
        .split("\n")
        .filter((s) => s.trim().length > 0).length;

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
                    <Package className="w-7 h-7 text-blue-600" />
                    Transferir Equipo entre Hoteles
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    Transfiere equipos de un hotel a otro, individual o masivamente.
                </p>
            </div>

            {/* Mensajes globales */}
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

            {/* Tab Switcher */}
            <div className="bg-white rounded-xl border border-slate-200 p-1.5 inline-flex gap-1">
                <button
                    onClick={() => setMode("individual")}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "individual"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                >
                    <Monitor className="w-4 h-4" />
                    Transferencia Individual
                </button>
                <button
                    onClick={() => setMode("multiple")}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "multiple"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                >
                    <Layers className="w-4 h-4" />
                    Transferencia Múltiple
                </button>
            </div>

            {/* ========== INDIVIDUAL MODE ========== */}
            {mode === "individual" && (
                <>
                    {/* Buscar Equipo */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-700 mb-4">1. Buscar Equipo</h2>

                        <form onSubmit={handleSearch} className="flex gap-3">
                            <input
                                type="text"
                                placeholder="Número de serie (ej. ABC123)"
                                value={serialInput}
                                onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
                                className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                type="submit"
                                disabled={searchLoading}
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                                {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Buscar"}
                            </button>
                        </form>

                        {searchError && (
                            <p className="mt-3 text-sm text-red-600">{searchError}</p>
                        )}

                        {/* Asset encontrado */}
                        {searchedAsset && (
                            <div className="mt-6 bg-slate-50 rounded-lg p-4">
                                <h3 className="font-medium text-slate-800 mb-2">Equipo encontrado:</h3>
                                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <dt className="text-slate-500">Serial:</dt>
                                    <dd className="font-mono text-slate-800">{searchedAsset.serial}</dd>
                                    <dt className="text-slate-500">Tipo:</dt>
                                    <dd className="text-slate-800">{searchedAsset.type.name}</dd>
                                    <dt className="text-slate-500">Marca:</dt>
                                    <dd className="text-slate-800">{searchedAsset.brand.name}</dd>
                                    <dt className="text-slate-500">Modelo:</dt>
                                    <dd className="text-slate-800">{searchedAsset.model.name}</dd>
                                    <dt className="text-slate-500">Hotel actual:</dt>
                                    <dd className="text-slate-800 font-medium">
                                        {searchedAsset.currentHotel?.name ?? "Sin hotel"}
                                    </dd>
                                    <dt className="text-slate-500">Estado:</dt>
                                    <dd>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${searchedAsset.status === "TRANSFERENCIA_PENDIENTE"
                                                ? "bg-amber-100 text-amber-800"
                                                : searchedAsset.status === "ALTA"
                                                    ? "bg-green-100 text-green-800"
                                                    : searchedAsset.status === "ASIGNADO"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {searchedAsset.status}
                                        </span>
                                    </dd>
                                </dl>

                                {searchedAsset.status === "TRANSFERENCIA_PENDIENTE" && (
                                    <p className="mt-4 text-sm text-amber-700 bg-amber-50 rounded px-3 py-2">
                                        ⚠️ Este equipo ya tiene una transferencia pendiente. Cancélala primero si quieres iniciar otra.
                                    </p>
                                )}

                                {searchedAsset.status === "BAJA" && (
                                    <p className="mt-4 text-sm text-red-700 bg-red-50 rounded px-3 py-2">
                                        ❌ No se puede transferir un equipo dado de baja.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Seleccionar Destino y Transferir */}
                    {searchedAsset &&
                        searchedAsset.status !== "TRANSFERENCIA_PENDIENTE" &&
                        searchedAsset.status !== "BAJA" && (
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h2 className="text-lg font-semibold text-slate-700 mb-4">
                                    2. Seleccionar Hotel Destino
                                </h2>

                                {availableHotels.length === 0 ? (
                                    <p className="text-sm text-slate-500">No hay hoteles disponibles para transferir.</p>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                                            {availableHotels.map((hotel) => (
                                                <label
                                                    key={hotel.id}
                                                    className={`
                                                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                                        ${destHotelId === hotel.id
                                                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                                        }
                                                    `}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="destHotel"
                                                        checked={destHotelId === hotel.id}
                                                        onChange={() => setDestHotelId(hotel.id)}
                                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm font-medium text-slate-700">{hotel.name}</span>
                                                </label>
                                            ))}
                                        </div>

                                        {destHotelId && (
                                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg mb-4">
                                                <div className="text-sm">
                                                    <span className="text-slate-500">Desde:</span>{" "}
                                                    <strong>{searchedAsset.currentHotel?.name}</strong>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-blue-600" />
                                                <div className="text-sm">
                                                    <span className="text-slate-500">Hacia:</span>{" "}
                                                    <strong>{hotels.find((h) => h.id === destHotelId)?.name}</strong>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            onClick={handleTransfer}
                                            disabled={!destHotelId || transferLoading}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {transferLoading ? (
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                            Transferir Equipo
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                </>
            )}

            {/* ========== MULTIPLE MODE ========== */}
            {mode === "multiple" && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
                    {/* Instrucciones */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Identificación (seriales)</p>
                            <p>Escribe o pega un número de serie por línea. Se crearán transferencias para todos los equipos válidos hacia el hotel destino seleccionado.</p>
                        </div>
                    </div>

                    {/* Textarea para seriales */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Números de serie ({serialCount} {serialCount === 1 ? "equipo" : "equipos"})
                        </label>
                        <textarea
                            value={bulkSerials}
                            onChange={(e) => setBulkSerials(e.target.value.toUpperCase())}
                            placeholder={"SERIAL001\nSERIAL002\nSERIAL003"}
                            rows={8}
                            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* Selector de hotel destino */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                            Hotel Destino
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {hotels.map((hotel) => (
                                <label
                                    key={hotel.id}
                                    className={`
                                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                        ${bulkDestHotelId === hotel.id
                                            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                        }
                                    `}
                                >
                                    <input
                                        type="radio"
                                        name="bulkDestHotel"
                                        checked={bulkDestHotelId === hotel.id}
                                        onChange={() => setBulkDestHotelId(hotel.id)}
                                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">{hotel.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleBulkTransfer}
                            disabled={bulkLoading || serialCount === 0 || !bulkDestHotelId}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {bulkLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            Transferir {serialCount} {serialCount === 1 ? "Equipo" : "Equipos"}
                        </button>
                        <button
                            onClick={handleClearBulk}
                            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                        >
                            <X className="w-4 h-4" />
                            Limpiar
                        </button>
                    </div>

                    {/* Resultados de transferencia múltiple */}
                    {bulkResults && bulkResults.length > 0 && (
                        <div className="mt-6">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">
                                Resultados de la Transferencia
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
                                                            Éxito
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
                                                        ? `Transferencia #${result.transferId} creada`
                                                        : result.error}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-3 flex gap-4 text-sm">
                                <span className="text-green-700">
                                    ✓ {bulkResults.filter((r) => r.success).length} exitoso(s)
                                </span>
                                <span className="text-red-600">
                                    ✗ {bulkResults.filter((r) => !r.success).length} con error
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Mis Transferencias Pendientes */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-700">
                        Mis Transferencias Pendientes
                    </h2>
                    <button
                        onClick={loadMyPending}
                        disabled={pendingLoading}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                        <RefreshCw className={`w-4 h-4 ${pendingLoading ? "animate-spin" : ""}`} />
                        Actualizar
                    </button>
                </div>

                {myPending.length === 0 ? (
                    <p className="text-sm text-slate-500">No tienes transferencias pendientes.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Serial</th>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Equipo</th>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Origen</th>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Destino</th>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Fecha</th>
                                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {myPending.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-mono">{t.asset.serial}</td>
                                        <td className="px-4 py-3">
                                            {t.asset.brand} {t.asset.model}
                                        </td>
                                        <td className="px-4 py-3">{t.originHotel.name}</td>
                                        <td className="px-4 py-3">{t.destHotel.name}</td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {new Date(t.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleCancel(t.id)}
                                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
                                            >
                                                <X className="w-4 h-4" />
                                                Cancelar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
