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
    evidences?: { id: number; url: string; filename?: string | null }[];
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



export default function DisposalsControlPage() {
    const [items, setItems] = React.useState<DisposalItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState("");

    // Hotel filter
    const [hotels, setHotels] = React.useState<Hotel[]>([]);
    const [selectedHotelId, setSelectedHotelId] = React.useState<string>("");

    // Month filter (separate month and year)
    const [selectedFilterMonth, setSelectedFilterMonth] = React.useState<string>("");
    const [selectedFilterYear, setSelectedFilterYear] = React.useState<string>("");

    const [exporting, setExporting] = React.useState(false);

    // Detail modal state
    const [detailModalOpen, setDetailModalOpen] = React.useState(false);
    const [selectedDisposal, setSelectedDisposal] = React.useState<DisposalDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

    // Edit mode state
    const [editMode, setEditMode] = React.useState(false);
    const [editReason, setEditReason] = React.useState("");
    const [editNotes, setEditNotes] = React.useState("");
    const [saving, setSaving] = React.useState(false);

    // Image management state
    const [imagesToDelete, setImagesToDelete] = React.useState<number[]>([]);
    const [newImages, setNewImages] = React.useState<File[]>([]);
    const [uploadingImages, setUploadingImages] = React.useState(false);

    // Drag and drop state
    const [isDragging, setIsDragging] = React.useState(false);

    // Image modal state
    const [selectedImages, setSelectedImages] = React.useState<string[]>([]);
    const [imageModalOpen, setImageModalOpen] = React.useState(false);

    // Generate year options dynamically (from 2015 to current year)
    const availableYears = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startYear = 2015;
        const years: number[] = [];
        for (let year = currentYear; year >= startYear; year--) {
            years.push(year);
        }
        return years;
    }, []);

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

        // Filter by month
        if (selectedFilterMonth || selectedFilterYear) {
            result = result.filter((item) => {
                const date = new Date(item.disposedAt);
                const itemYear = date.getFullYear();
                const itemMonth = date.getMonth() + 1;

                let matches = true;
                if (selectedFilterYear) {
                    matches = matches && itemYear === Number(selectedFilterYear);
                }
                if (selectedFilterMonth) {
                    matches = matches && itemMonth === Number(selectedFilterMonth);
                }
                return matches;
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
    }, [items, search, selectedHotelId, selectedFilterMonth, selectedFilterYear, hotels]);

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
            // Initialize edit values
            setEditMode(false);
            setEditReason(data.disposal.reason || "");
            setEditNotes(data.disposal.notes || "");
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
        setEditMode(false);
        setEditReason("");
        setEditNotes("");
        setImagesToDelete([]);
        setNewImages([]);
    }

    // Edit mode functions
    function handleStartEdit() {
        if (!selectedDisposal) return;
        setEditMode(true);
        setEditReason(selectedDisposal.reason);
        setEditNotes(selectedDisposal.notes || "");
    }

    function handleCancelEdit() {
        if (!selectedDisposal) return;
        setEditMode(false);
        setEditReason(selectedDisposal.reason);
        setEditNotes(selectedDisposal.notes || "");
    }

    async function handleSaveEdit() {
        if (!selectedDisposal) return;
        setSaving(true);
        setError(null);
        try {
            let newImageUrls: string[] = [];
            if (newImages.length > 0) {
                setUploadingImages(true);
                const formData = new FormData();
                newImages.forEach(file => formData.append('files', file));
                const uploadRes = await fetch('/api/uploads/evidence', { method: 'POST', body: formData });
                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    newImageUrls = data.urls || [];
                }
                setUploadingImages(false);
            }
            const res = await fetch(`/api/disposals/${selectedDisposal.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reason: editReason.trim(),
                    notes: editNotes.trim() || undefined,
                    evidenceIdsToDelete: imagesToDelete.length > 0 ? imagesToDelete : undefined,
                    newEvidenceUrls: newImageUrls.length > 0 ? newImageUrls : undefined,
                }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || data.message || "Error al guardar");
            }
            setImagesToDelete([]);
            setNewImages([]);
            await loadDisposals();
            await openDetailModal(selectedDisposal.id.toString());
            setEditMode(false);
            setSuccessMessage("Cambios guardados correctamente");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err?.message || "Error al guardar cambios");
        } finally {
            setSaving(false);
            setUploadingImages(false);
        }
    }

    function handleMarkImageForDeletion(evidenceId: number) {
        setImagesToDelete(prev => [...prev, evidenceId]);
    }

    function handleUnmarkImageForDeletion(evidenceId: number) {
        setImagesToDelete(prev => prev.filter(id => id !== evidenceId));
    }

    function handleAddImages(files: FileList) {
        const validImages = Array.from(files).filter(f => f.type.startsWith('image/'));
        setNewImages(prev => [...prev, ...validImages]);
    }

    function handleRemoveNewImage(index: number) {
        setNewImages(prev => prev.filter((_, i) => i !== index));
    }

    // Drag and drop handlers
    function handleDragEnter(e: React.DragEvent<HTMLLabelElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }

    function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDragLeave(e: React.DragEvent<HTMLLabelElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }

    function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleAddImages(files);
        }
    }

    async function handleExportSingle(disposalId: string, serial: string) {
        setError(null);
        try {
            const url = `/api/disposals/${disposalId}/export`;
            const res = await fetch(url);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Error al exportar");
            }
            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `baja_${serial}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            a.remove();
            setSuccessMessage(`Baja de ${serial} exportada correctamente`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err?.message || "Error al exportar");
        }
    }


    async function handleExport() {
        setExporting(true);
        try {
            const params = new URLSearchParams();
            if (selectedHotelId) {
                params.set("hotelId", selectedHotelId);
            }
            if (selectedFilterMonth && selectedFilterYear) {
                params.set("month", `${selectedFilterYear}-${selectedFilterMonth.padStart(2, '0')}`);
            }
            const url = `/api/disposals/export/xlsx?${params.toString()}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Error al exportar");

            const blob = await res.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = res.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || "bajas.xlsx";
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

                    {/* Month/Year filter */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select
                            value={selectedFilterMonth}
                            onChange={(e) => setSelectedFilterMonth(e.target.value)}
                            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500"
                        >
                            <option value="">Todos los meses</option>
                            <option value="1">Enero</option>
                            <option value="2">Febrero</option>
                            <option value="3">Marzo</option>
                            <option value="4">Abril</option>
                            <option value="5">Mayo</option>
                            <option value="6">Junio</option>
                            <option value="7">Julio</option>
                            <option value="8">Agosto</option>
                            <option value="9">Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                        </select>
                        <select
                            value={selectedFilterYear}
                            onChange={(e) => setSelectedFilterYear(e.target.value)}
                            className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500"
                        >
                            <option value="">Todos los años</option>
                            {availableYears.map((year) => (
                                <option key={year} value={String(year)}>
                                    {year}
                                </option>
                            ))}
                        </select>
                        {(selectedFilterMonth || selectedFilterYear) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedFilterMonth("");
                                    setSelectedFilterYear("");
                                }}
                                className="text-slate-400 hover:text-slate-600"
                                title="Limpiar filtro de fecha"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Export button */}
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        {exporting ? "Exportando..." : "Exportar Excel"}
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
                                        {item.evidences && item.evidences.length > 0 && (
                                            <div className="flex gap-2 mt-2">
                                                {item.evidences.slice(0, 3).map((evidence) => (
                                                    <img
                                                        key={evidence.id}
                                                        src={evidence.url}
                                                        alt={evidence.filename || `Evidencia ${evidence.id}`}
                                                        className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80"
                                                        onClick={() => openImageModal(item.evidences!.map(e => e.url))}
                                                    />
                                                ))}
                                                {item.evidences.length > 3 && (
                                                    <div
                                                        className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded border border-slate-200 text-xs text-slate-500 cursor-pointer hover:bg-slate-200"
                                                        onClick={() => openImageModal(item.evidences!.map(e => e.url))}
                                                    >
                                                        +{item.evidences.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                                            onClick={() => handleExportSingle(item.id, item.assetSerial)}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50"
                                            title="Exportar a Excel"
                                        >
                                            <Download className="w-4 h-4" />
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
                                        {editMode ? (
                                            <select
                                                value={editReason}
                                                onChange={(e) => setEditReason(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="OBSOLETO">OBSOLETO</option>
                                                <option value="DAÑO POR ACCIDENTE">DAÑO POR ACCIDENTE</option>
                                                <option value="DESGASTE NORMAL">DESGASTE NORMAL</option>
                                                <option value="ROBO">ROBO</option>
                                                <option value="PERDIDA">PERDIDA</option>
                                                <option value="OTRO">OTRO</option>
                                            </select>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                                <AlertTriangle className="w-4 h-4 mr-1" />
                                                {selectedDisposal.reason}
                                            </span>
                                        )}
                                    </div>
                                    {(editMode || selectedDisposal.notes) && (
                                        <div>
                                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">Notas</p>
                                            {editMode ? (
                                                <textarea
                                                    value={editNotes}
                                                    onChange={(e) => setEditNotes(e.target.value)}
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                    placeholder="Notas adicionales..."
                                                />
                                            ) : (
                                                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                    {selectedDisposal.notes}
                                                </p>
                                            )}
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
                                            Evidencia ({selectedDisposal.evidences.filter(e => !imagesToDelete.includes(e.id)).length} imágenes)
                                        </p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedDisposal.evidences
                                                .filter(e => !imagesToDelete.includes(e.id))
                                                .map((e) => (
                                                    <div key={e.id} className="relative group">
                                                        <img
                                                            src={e.url}
                                                            alt={e.filename || "Evidencia"}
                                                            className="w-full h-24 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80"
                                                            onClick={() => openImageModal(selectedDisposal.evidences.map((ev) => ev.url))}
                                                        />
                                                        {editMode && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMarkImageForDeletion(e.id)}
                                                                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                                                title="Eliminar imagen"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                        {editMode && imagesToDelete.length > 0 && (
                                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                                                <p className="text-xs text-red-700">
                                                    {imagesToDelete.length} imagen(es) serán eliminadas al guardar.
                                                    <button
                                                        type="button"
                                                        onClick={() => setImagesToDelete([])}
                                                        className="ml-2 text-xs underline hover:no-underline"
                                                    >
                                                        Deshacer
                                                    </button>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Add new images - Only in edit mode */}
                                {editMode && (
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">
                                            Agregar Imágenes
                                        </p>
                                        <label
                                            className={`block border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragging
                                                ? 'border-indigo-400 bg-indigo-50'
                                                : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
                                                }`}
                                            onDragEnter={handleDragEnter}
                                            onDragOver={handleDragOver}
                                            onDragLeave={handleDragLeave}
                                            onDrop={handleDrop}
                                        >
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={(e) => e.target.files && handleAddImages(e.target.files)}
                                                className="hidden"
                                            />
                                            <ImageIcon className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} />
                                            <p className={`text-sm ${isDragging ? 'text-indigo-600 font-medium' : 'text-slate-600'}`}>
                                                {isDragging ? 'Suelta las imágenes aquí' : 'Click o arrastra imágenes aquí'}
                                            </p>
                                        </label>

                                        {/* Preview of new images */}
                                        {newImages.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 mt-3">
                                                {newImages.map((file, index) => (
                                                    <div key={index} className="relative group">
                                                        <img
                                                            src={URL.createObjectURL(file)}
                                                            alt={file.name}
                                                            className="w-full h-24 object-cover rounded-lg border border-emerald-300"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveNewImage(index)}
                                                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                                                            title="Quitar imagen"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                        <span className="absolute bottom-1 left-1 text-xs bg-emerald-600 text-white px-2 py-0.5 rounded">
                                                            Nuevo
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Modal Footer */}
                        {selectedDisposal && !loadingDetail && (
                            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                                {!editMode ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={closeDetailModal}
                                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                                        >
                                            Cerrar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleStartEdit}
                                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                        >
                                            Editar
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            disabled={saving || uploadingImages}
                                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveEdit}
                                            disabled={saving || uploadingImages || !editReason.trim()}
                                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {(saving || uploadingImages) && <RefreshCw className="w-4 h-4 animate-spin" />}
                                            {uploadingImages ? "Subiendo imágenes..." : saving ? "Guardando..." : "Guardar Cambios"}
                                        </button>
                                    </>
                                )}
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
