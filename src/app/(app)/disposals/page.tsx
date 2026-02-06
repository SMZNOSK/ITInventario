//src/app/(app)/disposals/page.tsx:
"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  Search,
  RefreshCw,
  AlertTriangle,
  Laptop,
  Tag,
  Building2,
  Camera,
  X,
  ImagePlus,
  FileText,
  List,
} from "lucide-react";

type DisposalItem = {
  id: string;
  assetSerial: string;
  reason: string;
  notes?: string;
  evidenceUrl?: string;
  disposedAt: string;
};

type AssetInfo = {
  id: number;
  serial: string;
  typeName: string | null;
  brandName: string | null;
  modelName: string | null;
  hotelName: string | null;
};

type FormState = {
  assetSerial: string;
  reason: string;
  customReason: string;
  notes: string;
};

export default function DisposalsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = React.useState<DisposalItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Form state
  const [form, setForm] = React.useState<FormState>({
    assetSerial: "",
    reason: "",
    customReason: "",
    notes: "",
  });

  // Asset lookup state
  const [assetInfo, setAssetInfo] = React.useState<AssetInfo | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  // Evidence images
  const [evidenceImages, setEvidenceImages] = React.useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = React.useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tab state: 'single' or 'bulk'
  const [activeTab, setActiveTab] = React.useState<"single" | "bulk">("single");

  // Bulk disposal state
  const [bulkSerials, setBulkSerials] = React.useState("");
  const [bulkReason, setBulkReason] = React.useState("");
  const [bulkCustomReason, setBulkCustomReason] = React.useState("");
  const [bulkNotes, setBulkNotes] = React.useState("");
  const [bulkSubmitting, setBulkSubmitting] = React.useState(false);
  const [bulkResult, setBulkResult] = React.useState<{
    created?: { id: number; serial: string }[];
    notFound?: string[];
    alreadyBaja?: string[];
  } | null>(null);

  const loadDisposals = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/disposals", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Error al cargar bajas (${res.status})`);
      }
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al cargar bajas");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDisposals();
  }, [loadDisposals]);

  // Auto-populate from URL query params (when redirected from assets page)
  React.useEffect(() => {
    const serialFromUrl = searchParams.get("serial");
    if (serialFromUrl && !form.assetSerial) {
      setForm((prev) => ({ ...prev, assetSerial: serialFromUrl }));
      // Trigger search automatically
      searchAssetBySerial(serialFromUrl);
    }
  }, [searchParams]);

  // Search for asset by serial using resolve-serial endpoint
  async function searchAssetBySerial(serial: string) {
    if (!serial.trim()) {
      setSearchError("Ingresa el serial del equipo.");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setAssetInfo(null);

    try {
      const res = await fetch("/api/disposals/resolve-serial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serial: serial.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Equipo no encontrado.");
      }

      setAssetInfo({
        id: data.assetId,
        serial: data.serial,
        typeName: data.typeName ?? null,
        brandName: data.brandName ?? null,
        modelName: data.modelName ?? null,
        hotelName: data.hotelName ?? null,
      });
    } catch (err: any) {
      setSearchError(err?.message || "Error al buscar equipo.");
      setAssetInfo(null);
    } finally {
      setSearching(false);
    }
  }

  // Wrapper for search button click
  function handleSearchAsset() {
    searchAssetBySerial(form.assetSerial);
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear asset info if serial changes
    if (field === "assetSerial") {
      setAssetInfo(null);
      setSearchError(null);
    }
  }

  // Handle image selection
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newImages = [...evidenceImages, ...files];
    setEvidenceImages(newImages);

    // Create preview URLs
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...newUrls]);
  }

  function removeImage(index: number) {
    // Revoke the URL to free memory
    URL.revokeObjectURL(previewUrls[index]);

    setEvidenceImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!assetInfo) {
      setError("Primero busca y verifica el equipo antes de registrar la baja.");
      return;
    }

    if (!form.reason.trim()) {
      setError("El motivo de la baja es obligatorio.");
      return;
    }

    // Validate custom reason if "Otro" is selected
    if (form.reason === "OTRO" && !form.customReason.trim()) {
      setError("Debes especificar el motivo personalizado.");
      return;
    }

    try {
      setSubmitting(true);

      // Upload images first
      const uploadedUrls: string[] = [];
      for (const file of evidenceImages) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/uploads/evidence", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          uploadedUrls.push(uploadData.url);
        } else {
          console.error("Error uploading image:", file.name);
        }
      }

      // Build notes with evidence URLs
      let notesContent = form.notes.trim();
      if (uploadedUrls.length > 0) {
        const evidenceText = `\n\nEvidencia:\n${uploadedUrls.join("\n")}`;
        notesContent = notesContent ? notesContent + evidenceText : evidenceText.trim();
      }

      // Use custom reason if "Otro" is selected
      const finalReason = form.reason === "OTRO" ? form.customReason.trim() : form.reason.trim();

      const payload = {
        assetId: String(assetInfo.id),
        reason: finalReason,
        notes: notesContent || undefined,
        evidenceUrls: uploadedUrls, // For future DisposalEvidence integration
      };

      const res = await fetch("/api/disposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          `Error al crear baja (${res.status})`;
        throw new Error(msg);
      }

      setSuccess(`Baja registrada correctamente.${uploadedUrls.length > 0 ? ` ${uploadedUrls.length} imagen(es) guardada(s).` : ""}`);
      await loadDisposals();

      // Reset form
      setForm({ assetSerial: "", reason: "", customReason: "", notes: "" });
      setAssetInfo(null);
      setEvidenceImages([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al crear baja");
    } finally {
      setSubmitting(false);
    }
  }

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Bulk disposal submit
  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBulkResult(null);

    // Eliminar duplicados usando Set (case insensitive)
    const serials = Array.from(
      new Set(
        bulkSerials
          .split(/[\n,;]+/)
          .map((s) => s.trim().toUpperCase())
          .filter((s) => s.length > 0)
      )
    );

    if (serials.length === 0) {
      setError("Ingresa al menos un serial.");
      return;
    }

    if (!bulkReason.trim()) {
      setError("El motivo es obligatorio.");
      return;
    }

    // Validate custom reason if "Otro" is selected
    if (bulkReason === "OTRO" && !bulkCustomReason.trim()) {
      setError("Debes especificar el motivo personalizado.");
      return;
    }

    try {
      setBulkSubmitting(true);

      // Use custom reason if "Otro" is selected
      const finalBulkReason = bulkReason === "OTRO" ? bulkCustomReason.trim() : bulkReason.trim();

      const res = await fetch("/api/disposals/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serials,
          reason: finalBulkReason,
          notes: bulkNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Error al procesar bajas");
      }

      setBulkResult({
        created: data.created,
        notFound: data.notFound,
        alreadyBaja: data.alreadyBaja,
      });
      setSuccess(data.message || `${data.created?.length || 0} bajas registradas`);
      await loadDisposals();

      // Reset form
      setBulkSerials("");
      setBulkReason("");
      setBulkCustomReason("");
      setBulkNotes("");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al procesar bajas múltiples");
    } finally {
      setBulkSubmitting(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Archive className="w-7 h-7 text-red-600" />
            Bajas de Equipo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra equipos dados de baja y consulta su historial.
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

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Bulk result details */}
      {bulkResult && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
          {bulkResult.created && bulkResult.created.length > 0 && (
            <p className="text-sm text-emerald-700">
              ✓ Dados de baja: {bulkResult.created.map((c) => c.serial).join(", ")}
            </p>
          )}
          {bulkResult.notFound && bulkResult.notFound.length > 0 && (
            <p className="text-sm text-amber-700">
              ⚠ No encontrados: {bulkResult.notFound.join(", ")}
            </p>
          )}
          {bulkResult.alreadyBaja && bulkResult.alreadyBaja.length > 0 && (
            <p className="text-sm text-slate-600">
              ○ Ya en baja: {bulkResult.alreadyBaja.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === "single"
              ? "bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 shadow-sm border border-violet-100"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
          >
            <Laptop className="w-4 h-4" />
            Baja individual
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bulk")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium rounded-xl transition-all ${activeTab === "bulk"
              ? "bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 shadow-sm border border-violet-100"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
          >
            <List className="w-4 h-4" />
            Baja múltiple
          </button>
        </div>
      </div>

      {/* Bulk Form */}
      {activeTab === "bulk" && (
        <form onSubmit={handleBulkSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Baja Múltiple
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa múltiples seriales (separados por comas, punto y coma o saltos de línea)
            </p>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seriales de Equipos *
              </label>
              <textarea
                value={bulkSerials}
                onChange={(e) => setBulkSerials(e.target.value)}
                rows={5}
                placeholder="ABC123&#10;DEF456&#10;GHI789"
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500 font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                {new Set(bulkSerials.split(/[\n,;]+/).map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0)).size} serial(es) detectados (sin duplicados)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
                Motivo *
              </label>
              <div className={bulkReason === "OTRO" ? "grid grid-cols-2 gap-3" : ""}>
                <select
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500"
                >
                  <option value="">Selecciona un motivo...</option>
                  <option value="DAÑO FÍSICO">Daño físico</option>
                  <option value="DAÑO POR OBSOLECENCIA">Daño por obsolescencia</option>
                  <option value="ROBO">Robo</option>
                  <option value="EXTRAVÍO">Extravío</option>
                  <option value="OTRO">Otro</option>
                </select>

                {bulkReason === "OTRO" && (
                  <input
                    type="text"
                    value={bulkCustomReason}
                    onChange={(e) => setBulkCustomReason(e.target.value)}
                    placeholder="Escribe el motivo personalizado..."
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1 text-slate-400" />
                Notas adicionales
              </label>
              <textarea
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                rows={3}
                placeholder="Describe los detalles generales de la baja..."
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500"
              />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              type="submit"
              disabled={bulkSubmitting || !bulkSerials.trim() || !bulkReason.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Archive className="w-4 h-4" />
              {bulkSubmitting ? "Procesando..." : "Registrar Bajas Múltiples"}
            </button>
          </div>
        </form>
      )}

      {/* Single Form */}
      {activeTab === "single" && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Section: Equipo */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Datos del Equipo
            </h2>
          </div>
          <div className="p-6 space-y-5">
            {/* Serial Search */}
            <div className="max-w-lg">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                <Laptop className="w-4 h-4 text-slate-400" />
                Serial del Equipo *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.assetSerial}
                  onChange={(e) => handleChange("assetSerial", e.target.value)}
                  placeholder="Ej. POIUHGVBN9 o LAP-000001"
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchAsset())}
                />
                <button
                  type="button"
                  onClick={handleSearchAsset}
                  disabled={searching || !form.assetSerial.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="w-4 h-4" />
                  {searching ? "Buscando..." : "Buscar"}
                </button>
              </div>
              {searchError && (
                <p className="mt-1.5 text-xs text-red-600">{searchError}</p>
              )}
            </div>

            {/* Asset Info Cards */}
            {assetInfo && (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    <Tag className="w-4 h-4" />
                    Tipo
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {assetInfo.typeName || "—"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    <Laptop className="w-4 h-4" />
                    Marca
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {assetInfo.brandName || "—"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    <Laptop className="w-4 h-4" />
                    Modelo
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {assetInfo.modelName || "—"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    <Building2 className="w-4 h-4" />
                    Hotel Origen
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {assetInfo.hotelName || "—"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section: Motivo */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-6 py-4 border-t border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Motivo de la Baja
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                Motivo *
              </label>
              <div className={form.reason === "OTRO" ? "grid grid-cols-2 gap-3" : ""}>
                <select
                  value={form.reason}
                  onChange={(e) => handleChange("reason", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500 cursor-pointer"
                >
                  <option value="">Selecciona un motivo...</option>
                  <option value="DAÑO POR OBSOLECENCIA">Daño por obsolecencia</option>
                  <option value="DAÑO FÍSICO">Daño físico</option>
                  <option value="DAÑO POR ACCIDENTE">Daño por accidente</option>
                  <option value="ROBO">Robo</option>
                  <option value="EXTRAVÍO">Extravío</option>
                  <option value="VENTA O DISPOSICIÓN">Venta o disposición</option>
                  <option value="OTRO">Otro</option>
                </select>

                {form.reason === "OTRO" && (
                  <input
                    type="text"
                    value={form.customReason}
                    onChange={(e) => handleChange("customReason", e.target.value)}
                    placeholder="Escribe el motivo personalizado..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                Notas adicionales
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Describe los detalles de la baja..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-500"
              />
            </div>
          </div>

          {/* Section: Evidencia */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 border-t border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Evidencia Fotográfica
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Image preview grid */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Evidencia ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      {evidenceImages[index]?.name}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.add("border-violet-500", "bg-violet-50");
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove("border-violet-500", "bg-violet-50");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove("border-violet-500", "bg-violet-50");

                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
                if (files.length === 0) return;

                const newImages = [...evidenceImages, ...files];
                setEvidenceImages(newImages);

                const newUrls = files.map((file) => URL.createObjectURL(file));
                setPreviewUrls((prev) => [...prev, ...newUrls]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="relative flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer transition-all hover:border-violet-400 hover:bg-violet-50/50"
            >
              <div className="p-3 bg-white rounded-full shadow-sm">
                <Camera className="w-8 h-8 text-violet-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  Arrastra las imágenes aquí
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  o haz clic para seleccionar archivos
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <ImagePlus className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-400">PNG, JPG, JPEG hasta 10MB</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !assetInfo || !form.reason.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Archive className="w-4 h-4" />
              {submitting ? "Registrando..." : "Registrar Baja"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

