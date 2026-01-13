//src/app/(app)/disposals/control/page.tsx
"use client";

import * as React from "react";
import {
    Archive,
    RefreshCw,
    Search,
    Calendar,
    Laptop,
    Building2,
    AlertTriangle,
    FileText,
    Image as ImageIcon,
    Eye,
    X,
    CheckCircle,
    Download,
    Filter,
    Trash2,
} from "lucide-react";

type DisposalItem = {
    id: string;
    assetSerial: string;
    reason: string;
    notes?: string;
    evidenceUrls?: string[];
    disposedAt: string;
    restoredAt?: string | null;
    asset?: {
        id?: number;
        status?: string;
        typeName?: string | null;
        brandName?: string | null;
        modelName?: string | null;
        hotelName?: string | null;
    };
};

type DisposalDetail = {
    id: number;
    reason: string;
    notes?: string;
    disposedAt: string;
    restoredAt?: string | null;
    asset: {
        id: number;
        serial: string;
        status: string;
        typeName?: string | null;
        brandName?: string | null;
        modelName?: string | null;
        hotelName?: string | null;
    };
    hotel?: { id: number; name: string } | null;
    createdBy?: { id: number; name: string } | null;
    restoredBy?: { id: number; name: string } | null;
    evidences: { id: number; url: string; filename?: string }[];
};

type Hotel = { id: number; name: string };

// Helper: Extract evidence image URLs from notes field
function extractEvidenceUrls(notes?: string): string[] {
    if (!notes) return [];
    // Match URLs that start with /uploads/evidence/
    const regex = /\/uploads\/evidence\/[^\s\n]+/g;
    const matches = notes.match(regex);
    return matches || [];
}

export default function DisposalsControlPage() {
    const [items, setItems] = React.useState<DisposalItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState("");

    // Hotel filter
    const [hotels, setHotels] = React.useState<Hotel[]>([]);
    const [selectedHotelId, setSelectedHotelId] = React.useState<string>("");
    const [exporting, setExporting] = React.useState(false);

    // Detail modal state
    const [detailModalOpen, setDetailModalOpen] = React.useState(false);
    const [selectedDisposal, setSelectedDisposal] = React.useState<DisposalDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

    // Image modal state
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [imageModalOpen, setImageModalOpen] = React.useState(false);

    // Load hotels
    React.useEffect(() => {
        fetch("/api/catalog/hotels")
            .then((res) => res.json())
            .then((data) => setHotels(data.items ?? data ?? []))
            .catch(() => { });
    }, []);

    const loadDisposals = React.useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/disposals", {
                method: "GET",
                headers: { Accept: "application/json" },
            });
            if (!res.ok) throw new Error(`Error al cargar bajas (${res.status})`);
            const data = await res.json();
            setItems(data.items ?? []);
        } catch (err: any) {
            setError(err?.message || "Error al cargar bajas");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadDisposals();
    }, [loadDisposals]);

    const filteredItems = React.useMemo(() => {
        let result = items;

        // Filter by hotel
        if (selectedHotelId) {
            const hotelId = Number(selectedHotelId);
            result = result.filter((item) => {
                // Match by hotel name (from asset) since we store hotelId in disposal
                const hotel = hotels.find((h) => h.id === hotelId);
                return hotel && item.asset?.hotelName === hotel.name;
            });
        }

        // Filter by search
        const q = search.trim().toLowerCase();
        if (q) {
            result = result.filter((item) => {
                const text = [
                    item.assetSerial,
                    item.reason,
                    item.notes,
                    item.asset?.typeName,
                    item.asset?.brandName,
                    item.asset?.modelName,
                    item.asset?.hotelName,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                return text.includes(q);
            });
        }

        return result;
    }, [items, search, selectedHotelId, hotels]);

    const stats = React.useMemo(() => {
        const total = items.length;
        const thisMonth = items.filter((i) => {
            const date = new Date(i.disposedAt);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;
        return { total, thisMonth };
    }, [items]);

    async function openDetailModal(id: string) {
        setLoadingDetail(true);
        setDetailModalOpen(true);
        setSelectedDisposal(null);

        try {
            const res = await fetch(`/api/disposals/${id}`);
            if (!res.ok) throw new Error("Error al cargar detalle");
            const data = await res.json();
            setSelectedDisposal(data.disposal);
        } catch (err: any) {
            setError(err?.message || "Error al cargar detalle");
            setDetailModalOpen(false);
        } finally {
            setLoadingDetail(false);
        }
    }

    function closeDetailModal() {
        setDetailModalOpen(false);
        setSelectedDisposal(null);
    }

    async function handleExport() {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (selectedHotelId) {
                params.set("hotelId", selectedHotelId);
            }
            const url = `/api/disposals/export${params.toString() ? `?${params}` : ""}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Error al exportar");

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "bajas.csv";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
        } catch (err: any) {
            setError(err?.message || "Error al exportar");
        } finally {
            setExporting(false);
        }
    }

    async function handleDelete(disposalId: string, serial: string) {
        const confirm = window.confirm(
            `¿Eliminar registro de baja del equipo ${serial}?\n\nEsto solo elimina el registro del historial, no afecta el equipo.`
        );
        if (!confirm) return;

        try {
            const res = await fetch(`/api/disposals/${disposalId}/delete`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || "Error al eliminar");
            }

            setSuccessMessage(`Registro eliminado del historial.`);
            await loadDisposals();
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err?.message || "Error al eliminar");
        }
    }

    function openImageModal(urls: string[]) {
        setSelectedImages(urls);
        setImageModalOpen(true);
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
                        <Archive className="w-7 h-7 text-red-600" />
                        Control de Bajas
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Historial completo de equipos dados de baja.
                    </p>
                </div>
                <button
                    onClick={loadDisposals}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Actualizar
                </button>
            </header>

            {/* Success message */}
            {successMessage && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {successMessage}
                </div>
            )}

            {/* Stats */}
            <section className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Bajas</p>
                            <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
                        </div>
                        <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                            <Archive className="w-6 h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Este Mes</p>
                            <h3 className="text-2xl font-bold text-red-600">{stats.thisMonth}</h3>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg text-red-600">
                            <Calendar className="w-6 h-6" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por serial, motivo, tipo..."
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500"
                        />
                    </div>

                    {/* Hotel filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={selectedHotelId}
                            onChange={(e) => setSelectedHotelId(e.target.value)}
                            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500"
                        >
                            <option value="">Todos los hoteles</option>
                            {hotels.map((h) => (
                                <option key={h.id} value={String(h.id)}>
                                    {h.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Export button */}
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        {exporting ? "Exportando..." : "Exportar CSV"}
                    </button>
                </div>
            </section>

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                </div>
            )}

            {/* Table */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                        Historial de Bajas
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {filteredItems.length} {filteredItems.length === 1 ? "baja" : "bajas"} encontradas
                    </p>
                </div>

                {loading && (
                    <div className="px-6 py-12 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                        <p className="mt-2 text-sm text-slate-500">Cargando historial...</p>
                    </div>
                )}

                {!loading && filteredItems.length === 0 && (
                    <div className="px-6 py-12 text-center">
                        <Archive className="w-12 h-12 text-slate-300 mx-auto" />
                        <h3 className="mt-4 text-lg font-medium text-slate-600">Sin bajas registradas</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {search.trim() ? "No hay bajas que coincidan." : "Las bajas aparecerán aquí."}
                        </p>
                    </div>
                )}

                {!loading && filteredItems.length > 0 && (
                    <div className="divide-y divide-slate-100">
                        {filteredItems.map((item) => (
                            <div key={item.id} className={`p-6 ${item.restoredAt ? "bg-slate-50" : "hover:bg-slate-50"}`}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        {/* Header row */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <div className="flex items-center gap-2">
                                                <Laptop className="w-5 h-5 text-slate-400" />
                                                <span className="font-mono text-lg font-semibold text-slate-900">
                                                    {item.assetSerial}
                                                </span>
                                            </div>
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${item.restoredAt
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-red-100 text-red-800"
                                                }`}>
                                                {item.restoredAt ? (
                                                    <>
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Restaurado
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                                        {item.reason}
                                                    </>
                                                )}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                <Calendar className="w-3 h-3 inline mr-1" />
                                                {new Date(item.disposedAt).toLocaleDateString("es-MX", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </span>
                                        </div>

                                        {/* Asset info */}
                                        {item.asset && (
                                            <div className="flex gap-4 text-xs text-slate-600">
                                                {item.asset.typeName && <span><strong>Tipo:</strong> {item.asset.typeName}</span>}
                                                {item.asset.brandName && <span><strong>Marca:</strong> {item.asset.brandName}</span>}
                                                {item.asset.modelName && <span><strong>Modelo:</strong> {item.asset.modelName}</span>}
                                                {item.asset.hotelName && <span><strong>Hotel:</strong> {item.asset.hotelName}</span>}
                                            </div>
                                        )}

                                        {/* Evidence thumbnails */}
                                        {(() => {
                                            const urls = extractEvidenceUrls(item.notes);
                                            if (urls.length === 0) return null;
                                            return (
                                                <div className="flex gap-2 mt-2">
                                                    {urls.slice(0, 3).map((url, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={url}
                                                            alt={`Evidencia ${idx + 1}`}
                                                            className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80"
                                                            onClick={() => openImageModal(urls)}
                                                        />
                                                    ))}
                                                    {urls.length > 3 && (
                                                        <div
                                                            className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded border border-slate-200 text-xs text-slate-500 cursor-pointer hover:bg-slate-200"
                                                            onClick={() => openImageModal(urls)}
                                                        >
                                                            +{urls.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => openDetailModal(item.id)}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Ver Detalles
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(item.id, item.assetSerial)}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                                            title="Eliminar del historial"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Detail Modal */}
            {detailModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-slate-200">
                            <h3 className="text-lg font-semibold text-slate-800">
                                Detalle de Baja
                            </h3>
                            <button
                                type="button"
                                onClick={closeDetailModal}
                                className="p-2 text-slate-500 hover:bg-white/50 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        {loadingDetail ? (
                            <div className="p-12 text-center">
                                <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                                <p className="mt-2 text-sm text-slate-500">Cargando...</p>
                            </div>
                        ) : selectedDisposal ? (
                            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                {/* Asset info */}
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-slate-100 rounded-lg">
                                        <Laptop className="w-6 h-6 text-slate-600" />
                                    </div>
                                    <div>
                                        <p className="font-mono text-xl font-bold text-slate-900">
                                            {selectedDisposal.asset.serial}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            Estado actual: <span className={`font-medium ${selectedDisposal.asset.status === "BAJA" ? "text-red-600" : "text-emerald-600"
                                                }`}>{selectedDisposal.asset.status}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Info grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Tipo</p>
                                        <p className="text-sm font-semibold text-slate-800">{selectedDisposal.asset.typeName || "—"}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Marca</p>
                                        <p className="text-sm font-semibold text-slate-800">{selectedDisposal.asset.brandName || "—"}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Modelo</p>
                                        <p className="text-sm font-semibold text-slate-800">{selectedDisposal.asset.modelName || "—"}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Hotel</p>
                                        <p className="text-sm font-semibold text-slate-800">{selectedDisposal.hotel?.name || selectedDisposal.asset.hotelName || "—"}</p>
                                    </div>
                                </div>

                                {/* Reason and notes */}
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Motivo</p>
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                            <AlertTriangle className="w-4 h-4 mr-1" />
                                            {selectedDisposal.reason}
                                        </span>
                                    </div>
                                    {selectedDisposal.notes && (
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Notas</p>
                                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                {selectedDisposal.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Dates */}
                                <div className="flex gap-6 text-sm text-slate-600">
                                    <div>
                                        <span className="text-slate-400">Fecha de baja: </span>
                                        <span className="font-medium">
                                            {new Date(selectedDisposal.disposedAt).toLocaleString("es-MX")}
                                        </span>
                                    </div>
                                    {selectedDisposal.restoredAt && (
                                        <div>
                                            <span className="text-slate-400">Restaurado: </span>
                                            <span className="font-medium text-emerald-600">
                                                {new Date(selectedDisposal.restoredAt).toLocaleString("es-MX")}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Evidence */}
                                {selectedDisposal.evidences.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                                            Evidencia ({selectedDisposal.evidences.length} imágenes)
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedDisposal.evidences.map((e) => (
                                                <img
                                                    key={e.id}
                                                    src={e.url}
                                                    alt={e.filename || "Evidencia"}
                                                    className="w-full h-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80"
                                                    onClick={() => openImageModal(selectedDisposal.evidences.map((ev) => ev.url))}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Modal Footer */}
                        {selectedDisposal && !loadingDetail && (
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                                <button
                                    type="button"
                                    onClick={closeDetailModal}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Image Modal */}
            {imageModalOpen && selectedImages.length > 0 && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
                    <div className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-700">
                                Evidencia Fotográfica ({selectedImages.length} imágenes)
                            </h3>
                            <button
                                type="button"
                                onClick={() => setImageModalOpen(false)}
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedImages.map((url, idx) => (
                                    <img
                                        key={idx}
                                        src={url}
                                        alt={`Evidencia ${idx + 1}`}
                                        className="w-full rounded-lg border border-slate-200"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
