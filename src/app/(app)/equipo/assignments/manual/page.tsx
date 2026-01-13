// src/app/(app)/equipo/assignments/manual/page.tsx

"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ClipboardList,
  User,
  Mail,
  Building2,
  Briefcase,
  Laptop,
  Package,
  Tag,
  Layers,
  FileText,
  ChevronDown,
  X,
} from "lucide-react";

/* ========= Tipos auxiliares ========= */

type AvailableAsset = {
  id: number | string;
  code: string | null;
  serial: string | null;
  typeCode?: string | null;
  brandName?: string | null;
  modelName?: string | null;
  type?:
  | { code?: string | null; name?: string | null; }
  | string
  | null;
  brand?: { name?: string | null } | string | null;
  model?: { name?: string | null } | string | null;
};

type Platform = { id: number | string; name: string };
type Hotel = { id: number | string; name: string; isActive?: boolean | null };

type AssetPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: AvailableAsset) => void;
};

/* ========= Helpers ========= */

function getTypeLabel(asset: AvailableAsset): string {
  const fromType =
    typeof asset.type === "string"
      ? asset.type
      : asset.type?.code ?? asset.type?.name ?? null;
  return fromType ?? asset.typeCode ?? asset.code ?? "";
}

function getBrandLabel(asset: AvailableAsset): string {
  const fromBrand =
    typeof asset.brand === "string" ? asset.brand : asset.brand?.name ?? null;
  return fromBrand ?? asset.brandName ?? "";
}

function getModelLabel(asset: AvailableAsset): string {
  const fromModel =
    typeof asset.model === "string" ? asset.model : asset.model?.name ?? null;
  return fromModel ?? asset.modelName ?? "";
}

function normalizeOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/* ========= Modal de Inventario ========= */

function AssetPickerModal({ open, onClose, onSelect }: AssetPickerModalProps) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<AvailableAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/assets/available", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error(await res.text() || `Error HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setAssets(data.items ?? data ?? []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open]);

  const visibleAssets = useMemo(() => {
    const q = typeFilter.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((asset) => {
      const text = [getTypeLabel(asset), getBrandLabel(asset), getModelLabel(asset), asset.serial, asset.code]
        .filter(Boolean).join(" ").toLowerCase();
      return text.includes(q);
    });
  }, [assets, typeFilter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">
              Captura de Inventario
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona un equipo disponible para asignar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-100">
          <input
            type="text"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            placeholder='Buscar por tipo, marca, modelo, serial...'
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Marca</th>
                <th className="px-4 py-3 text-left">Modelo</th>
                <th className="px-4 py-3 text-left">Serial / ID</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Cargando equipos disponibles...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-red-500">{error}</td>
                </tr>
              )}
              {!loading && !error && visibleAssets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No se encontraron equipos disponibles.
                  </td>
                </tr>
              )}
              {!loading && !error && visibleAssets.map((asset) => (
                <tr key={String(asset.id)} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800">{getTypeLabel(asset) || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{getBrandLabel(asset) || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{getModelLabel(asset) || "—"}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{asset.serial ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onSelect(asset)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600"
                    >
                      Usar este equipo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ========= Página principal ========= */

export default function ManualAssignmentPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [direction, setDirection] = useState("");
  const [department, setDepartment] = useState("");

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelId, setHotelId] = useState("");
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelsError, setHotelsError] = useState<string | null>(null);

  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AvailableAsset | null>(null);
  const [assetDisplay, setAssetDisplay] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [teamName, setTeamName] = useState("");

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformId, setPlatformId] = useState("");
  const [platformLoading, setPlatformLoading] = useState(false);
  const [platformError, setPlatformError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadHotels() {
      try {
        setHotelsLoading(true);
        const res = await fetch("/api/catalog/hotels");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setHotels(data.items ?? data ?? []);
      } catch (err: any) {
        if (!cancelled) setHotelsError(err?.message ?? "Error al cargar hoteles");
      } finally {
        if (!cancelled) setHotelsLoading(false);
      }
    }
    loadHotels();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadPlatforms() {
      try {
        setPlatformLoading(true);
        const res = await fetch("/api/catalog/platforms");
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!cancelled) setPlatforms(data.items ?? data ?? []);
      } catch (err: any) {
        if (!cancelled) setPlatformError(err?.message ?? "Error al cargar plataformas");
      } finally {
        if (!cancelled) setPlatformLoading(false);
      }
    }
    loadPlatforms();
    return () => { cancelled = true; };
  }, []);

  const isPlatformAllowed = useMemo(() => {
    if (!selectedAsset) return false;
    const label = getTypeLabel(selectedAsset).toUpperCase();
    return label.startsWith("CPU") || label.startsWith("LAP");
  }, [selectedAsset]);

  useEffect(() => {
    if (!isPlatformAllowed) {
      setPlatformId("");
      setTeamName("");
    }
  }, [isPlatformAllowed]);

  function handleSelectAsset(asset: AvailableAsset) {
    setSelectedAsset(asset);
    const typeLabel = getTypeLabel(asset);
    const serialLabel = asset.serial ?? "";
    const codeLabel = asset.code ?? "";
    setAssetDisplay([typeLabel || codeLabel, serialLabel].filter(Boolean).join(" · ") || serialLabel || codeLabel);
    setAssetCode(asset.code ?? asset.serial ?? (typeof asset.id === "number" ? String(asset.id) : ""));
    setAssetModalOpen(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!assetCode) {
      alert("Debes seleccionar un equipo desde Inventario.");
      return;
    }
    if (!fullName.trim()) {
      alert("Debes capturar el nombre completo del colaborador.");
      return;
    }

    const selectedHotelName = hotelId && hotels.length
      ? hotels.find((h) => String(h.id) === hotelId)?.name ?? null
      : null;

    let platformName: string | null = null;
    if (isPlatformAllowed && platformId) {
      platformName = platforms.find((p) => String(p.id) === platformId)?.name ?? null;
    }

    const payload = {
      assetCode,
      collaboratorName: fullName.trim(),
      collaboratorEmail: normalizeOrNull(email),
      direction: normalizeOrNull(direction),
      department: normalizeOrNull(department),
      hotelLabel: selectedHotelName,
      teamName: isPlatformAllowed && teamName.trim() ? teamName.trim() : null,
      platformName,
      notes: normalizeOrNull(description),
    };

    try {
      setSubmitting(true);
      const res = await fetch("/api/assignments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text() || `Error HTTP ${res.status}`);

      alert("Asignación manual creada correctamente.");

      setFullName("");
      setEmail("");
      setDirection("");
      setDepartment("");
      setHotelId("");
      setSelectedAsset(null);
      setAssetDisplay("");
      setAssetCode("");
      setTeamName("");
      setPlatformId("");
      setDescription("");
    } catch (err: any) {
      alert(err?.message ?? "Error al crear la asignación manual");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-amber-600" />
            Asignación sin número de colaborador
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra un resguardo especial para un colaborador que aún no cuenta con número en PeopleSoft.
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Datos del colaborador */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Datos del Colaborador (captura manual)
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nombre Apellido"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Correo del colaborador
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Dirección / Área
                </label>
                <input
                  type="text"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  placeholder="Dirección o área"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  Gerencia / Departamento
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Gerencia o departamento"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="max-w-md">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                Hotel / Sede
              </label>
              <div className="relative">
                <select
                  value={hotelId}
                  onChange={(e) => setHotelId(e.target.value)}
                  disabled={hotelsLoading || hotels.length === 0}
                  className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                >
                  <option value="">
                    {hotelsLoading ? "Cargando hoteles..." : "Selecciona un hotel"}
                  </option>
                  {hotels.map((h) => (
                    <option key={String(h.id)} value={String(h.id)}>{h.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {hotelsError && <p className="mt-1 text-xs text-red-500">{hotelsError}</p>}
            </div>
          </div>

          {/* Equipo asignado */}
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-4 border-t border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Equipo Asignado
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                  <Laptop className="w-4 h-4 text-slate-400" />
                  Equipo / Inventario *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assetDisplay}
                    onChange={(e) => setAssetDisplay(e.target.value)}
                    placeholder="Selecciona un equipo desde Inventario"
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setAssetModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600"
                  >
                    <Package className="w-4 h-4" />
                    Inventario
                  </button>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                  <Tag className="w-4 h-4 text-slate-400" />
                  Nombre de equipo
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value.toUpperCase())}
                  placeholder={isPlatformAllowed ? "Ej. GGUERREROMID" : "No aplica para este tipo"}
                  disabled={!isPlatformAllowed}
                  className={`w-full rounded-lg border px-4 py-2.5 text-sm ${isPlatformAllowed
                      ? "border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                    }`}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Solo aplica para equipos de tipo CPU o LAPTOP.
                </p>
              </div>
            </div>

            <div className="max-w-md">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                <Layers className="w-4 h-4 text-slate-400" />
                Plataforma
              </label>
              <div className="relative">
                <select
                  value={platformId}
                  onChange={(e) => setPlatformId(e.target.value)}
                  disabled={!isPlatformAllowed || platformLoading || platforms.length === 0}
                  className={`w-full appearance-none rounded-lg border px-4 py-2.5 text-sm cursor-pointer ${isPlatformAllowed
                      ? "border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
                    }`}
                >
                  <option value="">
                    {platformLoading ? "Cargando plataformas..." : "Selecciona una plataforma"}
                  </option>
                  {platforms.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              {platformError && <p className="mt-1 text-xs text-red-500">{platformError}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                <FileText className="w-4 h-4 text-slate-400" />
                Descripción / Comentarios
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles adicionales del resguardo (opcional)"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-amber-100 focus:border-amber-500"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Guardando..." : "Guardar asignación manual"}
            </button>
          </div>
        </form>
      </div>

      <AssetPickerModal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        onSelect={handleSelectAsset}
      />
    </>
  );
}
