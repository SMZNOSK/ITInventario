// src/app/(app)/equipo/loans/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";

/** Helpers */
function safeText(v: any): string {
  return String(v ?? "").trim();
}

function toISODateStart(yyyyMmDd: string) {
  const d = new Date(`${yyyyMmDd}T00:00:00`);
  return Number.isNaN(d.getTime()) ? yyyyMmDd : d.toISOString();
}

function toISODateEnd(yyyyMmDd: string) {
  const d = new Date(`${yyyyMmDd}T23:59:59`);
  return Number.isNaN(d.getTime()) ? yyyyMmDd : d.toISOString();
}

/** Tipos */
type AvailableAsset = {
  id: number | string;
  code: string | null;
  serial: string | null;
  typeCode?: string | null;
  brandName?: string | null;
  modelName?: string | null;
  type?: { code?: string | null; name?: string | null } | string | null;
  brand?: { name?: string | null } | string | null;
  model?: { name?: string | null } | string | null;
};

type AssetPickerModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (asset: AvailableAsset) => void;
};

type PlatformItem = { id: number; name: string; isActive?: boolean };
type HotelItem = { id: number; name: string; isActive?: boolean };

function getTypeLabel(asset: AvailableAsset): string {
  const fromType =
    typeof asset.type === "string"
      ? asset.type
      : asset.type?.code ?? asset.type?.name ?? null;
  return fromType ?? asset.typeCode ?? "";
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

function pickCollaborator(payload: any) {
  if (!payload || typeof payload !== "object") return null;
  const c = (payload.item ?? payload.collaborator ?? payload) as any;
  if (!c || typeof c !== "object") return null;
  return {
    id: safeText(c.id) || undefined,
    name: c.name ?? c.fullName ?? null,
    email: c.email ?? null,
    address: c.address ?? null,
    direction: c.direction ?? c.direccion ?? null,
    departmentName: c.departmentName ?? null,
    department: c.department ?? null,
  };
}

function pickPlatforms(payload: any): PlatformItem[] {
  const arr = (payload?.items ?? payload) as any;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p: any) => ({
      id: Number(p?.id),
      name: safeText(p?.name),
      isActive: typeof p?.isActive === "boolean" ? p.isActive : undefined,
    }))
    .filter((p) => Number.isFinite(p.id) && !!p.name);
}

function pickHotels(payload: any): HotelItem[] {
  const arr = (payload?.items ?? payload) as any;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((h: any) => ({
      id: Number(h?.id),
      name: safeText(h?.name),
      isActive: typeof h?.isActive === "boolean" ? h.isActive : undefined,
    }))
    .filter((h) => Number.isFinite(h.id) && !!h.name);
}

/** Iconos */
const Icons = {
  User: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  ),
  Search: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  Device: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
  Hotel: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5"
      />
    </svg>
  ),
  Calendar: () => (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  ),
  Tag: () => (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  ),
};

/** Modal selector (más compacto) */
function AssetPickerModal({ open, onClose, onSelect }: AssetPickerModalProps) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<AvailableAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/assets/available", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar inventario");
        if (!cancelled) setAssets(data?.items ?? data ?? []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const visible = useMemo(() => {
    const needle = safeText(q).toLowerCase();
    if (!needle) return assets;
    return assets.filter((a) => {
      const t = getTypeLabel(a).toLowerCase();
      const b = getBrandLabel(a).toLowerCase();
      const m = getModelLabel(a).toLowerCase();
      const s = safeText(a.serial ?? "").toLowerCase();
      const c = safeText(a.code ?? "").toLowerCase();
      return t.includes(needle) || b.includes(needle) || m.includes(needle) || s.includes(needle) || c.includes(needle);
    });
  }, [assets, q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-7 py-5">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-900">Seleccionar equipo</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">Inventario disponible para préstamo</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2.5 text-slate-400 transition hover:bg-slate-200"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="p-7">
          <div className="relative mb-4">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              <Icons.Search />
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrar por tipo, marca, modelo o serie..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-5 py-3 text-sm font-bold shadow-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          <div className="max-h-[48vh] overflow-y-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left">
              <thead className="sticky top-0 border-b border-slate-100 bg-white text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Marca / Modelo</th>
                  <th className="px-6 py-4">Serie / ID</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading && (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-sm text-slate-400">
                      Cargando…
                    </td>
                  </tr>
                )}

                {!loading && error && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-red-500">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  visible.map((asset) => (
                    <tr key={String(asset.id)} className="group transition hover:bg-slate-50/70">
                      <td className="px-6 py-4.5">
                        <span className="inline-block rounded-xl border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase text-indigo-700">
                          {getTypeLabel(asset) || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="text-sm font-bold text-slate-800">{getBrandLabel(asset) || "—"}</div>
                        <div className="mt-0.5 text-[11px] font-bold text-slate-400">{getModelLabel(asset) || "—"}</div>
                      </td>
                      <td className="px-6 py-4.5 bg-slate-50/30 font-mono text-[11px] font-bold text-slate-500">
                        {asset.serial || asset.code || "—"}
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <button
                          type="button"
                          onClick={() => onSelect(asset)}
                          className="rounded-xl bg-slate-900 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-indigo-600"
                        >
                          Usar
                        </button>
                      </td>
                    </tr>
                  ))}

                {!loading && !error && visible.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-slate-400">
                      Sin resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <style>{`
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
            ::-webkit-scrollbar-thumb:hover { background: #CBD5E1; background-clip: content-box; }
          `}</style>
        </div>
      </div>
    </div>
  );
}

/** Página */
export default function LoansPage() {
  const router = useRouter();
  const { fetchJSON } = useAuth();

  // colaborador
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeDirection, setEmployeeDirection] = useState("");
  const [employeeDept, setEmployeeDept] = useState("");
  const [collabLoading, setCollabLoading] = useState(false);
  const [collabError, setCollabError] = useState<string | null>(null);

  // hostname
  const [computerName, setComputerName] = useState("");

  // activo
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AvailableAsset | null>(null);
  const equipmentLabel = useMemo(() => {
    if (!selectedAsset) return "";
    const typeLabel = getTypeLabel(selectedAsset);
    const serialLabel = selectedAsset.serial ?? selectedAsset.code ?? "";
    return [typeLabel, serialLabel ? `S/N: ${serialLabel}` : ""].filter(Boolean).join(" · ");
  }, [selectedAsset]);

  // catálogos
  const [platforms, setPlatforms] = useState<PlatformItem[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [platformId, setPlatformId] = useState<number | "">("");

  const [hotels, setHotels] = useState<HotelItem[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [hotelId, setHotelId] = useState<number | "">("");

  // fechas + notas
  const [loanStart, setLoanStart] = useState(new Date().toISOString().slice(0, 10));
  const [loanEnd, setLoanEnd] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  // UI
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedAssetType = useMemo(
    () => safeText(selectedAsset ? getTypeLabel(selectedAsset) : ""),
    [selectedAsset],
  );

  const isEligibleForComputerFields = useMemo(() => {
    const t = safeText(selectedAssetType).toUpperCase();
    return t.startsWith("LAP") || t.startsWith("CPU");
  }, [selectedAssetType]);

  useEffect(() => {
    if (!isEligibleForComputerFields) {
      setComputerName("");
      setPlatformId("");
    }
  }, [isEligibleForComputerFields]);

  useEffect(() => {
    async function loadCatalog() {
      setPlatformsLoading(true);
      setHotelsLoading(true);

      // Cargar plataformas
      try {
        const pData = await fetchJSON("/api/catalog/platforms");
        setPlatforms(pickPlatforms(pData));
      } catch (err) {
        console.warn("No se pudieron cargar plataformas:", err);
        setPlatforms([]);
      } finally {
        setPlatformsLoading(false);
      }

      // Cargar hoteles
      try {
        const hData = await fetchJSON("/api/catalog/hotels");
        setHotels(pickHotels(hData));
      } catch (err) {
        console.warn("No se pudieron cargar hoteles:", err);
        setHotels([]);
      } finally {
        setHotelsLoading(false);
      }
    }
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLookup = async () => {
    const empl = employeeNumber.trim();
    if (!empl) {
      setCollabError("Capture el número");
      return;
    }
    setCollabLoading(true);
    setCollabError(null);

    try {
      const data = await fetchJSON(`/api/collaborators/${encodeURIComponent(empl)}`);
      if (data && data.error) throw new Error(String(data.error));
      const c = pickCollaborator(data);
      if (!c || !c.name) throw new Error("Colaborador no encontrado");

      setEmployeeName(safeText(c.name));
      setEmployeeEmail(safeText(c.email));
      setEmployeeDirection(safeText(c.direction || c.address));
      setEmployeeDept(safeText(c.departmentName || c.department));
    } catch (err: any) {
      setCollabError(err?.message ?? "Error al buscar");
      setEmployeeName("");
      setEmployeeEmail("");
      setEmployeeDirection("");
      setEmployeeDept("");
    } finally {
      setCollabLoading(false);
    }
  };

  const validate = () => {
    const errors: string[] = [];
    if (!employeeNumber.trim()) errors.push("Número de colaborador requerido.");
    if (!employeeName.trim()) errors.push("Nombre de colaborador requerido (usa Buscar).");
    if (!selectedAsset) errors.push("Selecciona un equipo del inventario.");
    if (!loanStart) errors.push("Fecha de inicio requerida.");
    if (!loanEnd) errors.push("Fecha de devolución requerida.");
    if (loanStart && loanEnd && loanEnd < loanStart) errors.push("La devolución no puede ser antes del inicio.");

    if (isEligibleForComputerFields) {
      if (!computerName.trim()) errors.push("Nombre del equipo (hostname) requerido para LAP/CPU.");
      if (!platformId) errors.push("Plataforma requerida para LAP/CPU.");
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors = validate();
    if (errors.length) {
      setFormError(errors.join(" "));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        collaboratorId: safeText(employeeNumber),
        collaboratorName: safeText(employeeName),
        collaboratorEmail: safeText(employeeEmail) || null,
        departmentName: safeText(employeeDept) || null,

        hotelId: hotelId ? Number(hotelId) : null,

        deviceName: isEligibleForComputerFields ? safeText(computerName) : null,
        teamName: isEligibleForComputerFields ? safeText(computerName) : null,

        platformId: isEligibleForComputerFields && platformId ? Number(platformId) : null,

        assetId: selectedAsset ? selectedAsset.id : null,
        assetCode: selectedAsset?.code ?? null,
        assetSerial: selectedAsset?.serial ?? null,
        assetLabel: equipmentLabel || null,

        comments: safeText(description) || null,

        startDate: toISODateStart(loanStart),
        endDate: toISODateEnd(loanEnd),
      };

      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error ?? data?.message ?? `Error al procesar préstamo (HTTP ${res.status})`;
        throw new Error(String(msg));
      }

      router.push("/equipo/loans/control");
      router.refresh();
    } catch (err: any) {
      setFormError(err?.message ?? "Error al procesar préstamo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Crear nuevo préstamo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Registro de asignación temporal de activos de TI.
          </p>
        </div>

        {formError && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {formError}
          </div>
        )}
      </header>

      <main>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1) Colaborador */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-indigo-600 p-2 text-white">
                <Icons.User />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Datos del colaborador</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Validación de identidad
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Número de colaborador
                </label>
                <div className="flex gap-2">
                  <input
                    value={employeeNumber}
                    onChange={(e) => setEmployeeNumber(e.target.value)}
                    placeholder="Ej. 391159"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={collabLoading}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-indigo-600 disabled:opacity-60"
                  >
                    {collabLoading ? "Buscando..." : "Buscar"}
                  </button>
                </div>

                {collabError && (
                  <p className="mt-2 text-xs text-red-600">{collabError}</p>
                )}
              </div>

              <div className="md:col-span-8">
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Nombre completo
                </label>
                <input
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Se completará automáticamente..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="md:col-span-6">
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Correo electrónico
                </label>
                <input
                  value={employeeEmail}
                  onChange={(e) => setEmployeeEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="md:col-span-6">
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Dirección / PeopleSoft
                </label>
                <input
                  value={employeeDirection}
                  onChange={(e) => setEmployeeDirection(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="md:col-span-12">
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Gerencia / Departamento
                </label>
                <input
                  value={employeeDept}
                  onChange={(e) => setEmployeeDept(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </section>

          {/* 2) Hotel  */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-amber-500 p-2 text-white">
                <Icons.Hotel />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Hotel / Sede</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Ubicación del préstamo
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-600">
                Sede del préstamo
              </label>
              <select
                value={hotelId}
                onChange={(e) => setHotelId(e.target.value ? Number(e.target.value) : "")}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">{hotelsLoading ? "Cargando..." : "Seleccione una sede..."}</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* 3) Datos préstamo */}
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500 p-2 text-white">
                <Icons.Device />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-800">Datos del préstamo</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Equipo, plataforma y periodo
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Equipo (inventario) *
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-600">
                    {equipmentLabel || "No se ha seleccionado equipo..."}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssetModalOpen(true)}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-700"
                  >
                    Inventario
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Plataforma
                </label>
                {isEligibleForComputerFields ? (
                  <select
                    value={platformId}
                    onChange={(e) => setPlatformId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">{platformsLoading ? "Cargando..." : "Seleccione plataforma..."}</option>
                    {platforms.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-slate-100 px-3 py-2 text-center text-xs text-slate-400">
                    No aplica
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Nombre del equipo (hostname)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Icons.Tag />
                  </div>
                  <input
                    value={computerName}
                    onChange={(e) => setComputerName(e.target.value)}
                    disabled={!isEligibleForComputerFields}
                    placeholder={isEligibleForComputerFields ? "Ej. PRESTAMOLAP1" : "No aplica para este tipo de equipo"}
                    className={`w-full rounded-lg border px-3 py-2 pl-9 text-sm outline-none transition ${isEligibleForComputerFields
                        ? "border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        : "border-dashed border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                  />
                </div>
                {isEligibleForComputerFields && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Aparecerá en la columna "Nombre del equipo"
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Fecha de inicio
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Icons.Calendar />
                  </div>
                  <input
                    type="date"
                    value={loanStart}
                    onChange={(e) => setLoanStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pl-9 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Fecha de devolución
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Icons.Calendar />
                  </div>
                  <input
                    type="date"
                    value={loanEnd}
                    onChange={(e) => setLoanEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pl-9 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Descripción / comentarios
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles del estado físico, accesorios incluidos, etc."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
          </section>

          {/* Acción */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creando..." : "Crear préstamo"}
            </button>
          </div>
        </form>
      </main>

      <AssetPickerModal
        open={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        onSelect={(asset) => {
          setSelectedAsset(asset);
          setAssetModalOpen(false);
        }}
      />

      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0.55;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
