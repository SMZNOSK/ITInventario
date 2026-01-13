// src/app/(app)/assets/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  MapPin,
  Monitor,
  Cpu,
  Headphones,
  Laptop,
  Tablet,
  Wifi,
  Building2,
  ChevronDown,
} from "lucide-react";

type AssetStatus = "ALTA" | "ASIGNADO" | "TRANSFERENCIA_PENDIENTE" | "BAJA";

type AssetApi = {
  id: number;
  serial: string;
  status: AssetStatus;
  typeId?: number | null;
  brandId?: number | null;
  modelId?: number | null;
  currentHotelId?: number | null;
  olderThan3Years?: boolean;
  overThreeYears?: boolean;

  // Nuevos campos de factura que vienen del backend
  invoiceNumber?: string | null;
  invoiceDate?: string | null;

  typeName?: string | null;
  brandName?: string | null;
  modelName?: string | null;
  hotelName?: string | null;
};

type AssetRow = {
  id: number;
  serial: string;
  status: AssetStatus;
  typeLabel: string;
  brandLabel: string;
  modelLabel: string;
  hotelLabel: string;
  olderThan3Years: boolean;

  invoiceNumber: string | null;
  invoiceDate: string | null; // ISO string o null
};

/* ===== Helpers de presentación de estatus ===== */

function getStatusLabel(status: AssetStatus): string {
  switch (status) {
    case "ALTA":
      return "Activo";
    case "ASIGNADO":
      return "Asignado";
    case "TRANSFERENCIA_PENDIENTE":
      return "Transferencia pendiente";
    case "BAJA":
      return "Desactivado";
    default:
      return status;
  }
}

function getStatusClasses(status: AssetStatus): string {
  const base =
    "px-3 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase";

  switch (status) {
    case "ALTA":
      return base + " bg-emerald-100 text-emerald-800";
    case "ASIGNADO":
      return base + " bg-blue-100 text-blue-800";
    case "TRANSFERENCIA_PENDIENTE":
      return base + " bg-amber-100 text-amber-800";
    case "BAJA":
      return base + " bg-rose-100 text-rose-800";
    default:
      return base + " bg-slate-100 text-slate-700";
  }
}

/* Icono del tipo de activo (solo presentación) */
function AssetTypeIcon({ label }: { label: string }) {
  const t = (label || "").toUpperCase();
  let Icon: React.ComponentType<{ size?: number }> = Monitor;

  if (t.includes("LAPTOP") || t.includes("NOTEBOOK")) Icon = Laptop;
  else if (t.includes("TABLET") || t.includes("TAB")) Icon = Tablet;
  else if (t.includes("WIFI")) Icon = Wifi;
  else if (t.includes("DIADEMA") || t.includes("HEADPHONE")) Icon = Headphones;
  else if (t.includes("CPU") || t.includes("PC")) Icon = Cpu;

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Icon size={18} />
    </div>
  );
}

/* Formato amigable para la fecha de factura */
function formatInvoiceDate(dateIso: string | null): string {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/* ===== Tipos flexibles para “a quién está asignado / prestado” ===== */

type OwnerInfo = {
  kind: "ASSIGNMENT" | "LOAN";
  collaboratorId?: string;
  collaboratorName?: string | null;
  display: string;
};

export default function AssetsPage() {
  const { fetchJSON } = useAuth();
  const router = useRouter();

  /* ===== Estado tabla/listado ===== */

  const [rows, setRows] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [hotelFilter, setHotelFilter] = useState<string>("");
  const [hotels, setHotels] = useState<{ id: number; name: string }[]>([]);

  const [importCode, setImportCode] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const [rowActionMsg, setRowActionMsg] = useState<string | null>(null);

  /* ===== Modal ===== */

  const [modalAssetId, setModalAssetId] = useState<number | null>(null);
  const [modalStatus, setModalStatus] = useState<AssetStatus>("ALTA");
  const [modalOlderThan3, setModalOlderThan3] = useState<boolean>(false);

  // “Asignado / Prestado a…”
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null);

  /* ===== Query de filtros existentes ===== */

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (statusFilter) p.set("status", statusFilter);
    if (hotelFilter) p.set("hotelId", hotelFilter);
    return p.toString();
  }, [q, statusFilter, hotelFilter]);

  /* ===== Cargar lista de hoteles ===== */
  useEffect(() => {
    async function loadHotels() {
      try {
        const res = await fetchJSON<{ items: { id: number; name: string }[] }>("/api/hotels/active");
        setHotels(res.items ?? []);
      } catch (e) {
        console.error("Error cargando hoteles:", e);
      }
    }
    loadHotels();
  }, [fetchJSON]);

  const currentModalAsset = useMemo(
    () => rows.find((r) => r.id === modalAssetId) || null,
    [rows, modalAssetId],
  );

  /* ========= Cargar lista de activos ========= */

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      const data = await fetchJSON<{ items: AssetApi[] }>(
        `/api/assets${qs ? `?${qs}` : ""}`,
      );

      const items = Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray(data)
          ? (data as any)
          : [];

      setRows(
        items.map((a: AssetApi) => {
          const typeLabel =
            a.typeName ??
            (a as any).typeLabel ??
            (a as any).type ??
            (typeof a.typeId === "number" ? String(a.typeId) : "-");

          const brandLabel =
            a.brandName ??
            (a as any).brandLabel ??
            (a as any).brand ??
            (typeof a.brandId === "number" ? String(a.brandId) : "-");

          const modelLabel =
            a.modelName ??
            (a as any).modelLabel ??
            (a as any).model ??
            (typeof a.modelId === "number" ? String(a.modelId) : "-");

          const hotelLabel =
            a.hotelName ??
            (a as any).hotelLabel ??
            (a as any).hotel ??
            (typeof a.currentHotelId === "number"
              ? String(a.currentHotelId)
              : "-");

          const olderThan3Years =
            typeof a.olderThan3Years === "boolean"
              ? a.olderThan3Years
              : Boolean((a as any).overThreeYears);

          const invoiceNumber =
            (a as any).invoiceNumber !== undefined
              ? (a as any).invoiceNumber
              : null;

          let invoiceDate: string | null = null;
          const rawDate = (a as any).invoiceDate;
          if (rawDate) {
            invoiceDate =
              typeof rawDate === "string"
                ? rawDate
                : new Date(rawDate).toISOString();
          }

          return {
            id: a.id,
            serial: a.serial,
            status: a.status ?? "ALTA",
            typeLabel: typeLabel || "-",
            brandLabel: brandLabel || "-",
            modelLabel: modelLabel || "-",
            hotelLabel: hotelLabel || "-",
            olderThan3Years,
            invoiceNumber: invoiceNumber ?? null,
            invoiceDate,
          };
        }),
      );
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Error al cargar activos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  /* ========= Importar por código ========= */

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const code = importCode.trim();
    if (!code) return;

    try {
      setImportLoading(true);
      setImportMsg(null);

      const res = await fetch(
        `/api/assets/import/by-code/${encodeURIComponent(code)}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || (data && data.ok === false)) {
        const msg =
          data?.message || data?.error || data?.reason || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      setImportMsg(`✅ Importado: ${code}`);
      setImportCode("");
      await load();
    } catch (e: any) {
      console.error(e);
      setImportMsg(`❌ Error: ${e?.message || "No se pudo importar"}`);
    } finally {
      setImportLoading(false);
    }
  }

  /* ========= Acciones sobre filas ========= */

  async function updateRow(id: number, patch: { olderThan3Years?: boolean }) {
    setRowActionMsg(null);

    // Adaptamos al nombre esperado por el backend: overThreeYears
    const payload: any = {};
    if (typeof patch.olderThan3Years === "boolean") {
      payload.overThreeYears = patch.olderThan3Years;
    }

    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.message || data?.error || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      await load();
    } catch (e: any) {
      console.error(e);
      setRowActionMsg(
        e?.message || "No se pudo actualizar el activo seleccionado",
      );
      throw e;
    }
  }

  async function handleDelete(id: number) {
    setRowActionMsg(null);
    const ok = window.confirm(
      "¿Seguro que quieres eliminar este equipo?\nSi tiene asignaciones o bajas, no se podrá borrar.",
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          data?.message || data?.error || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      setRowActionMsg("Equipo eliminado correctamente.");
      await load();
    } catch (e: any) {
      console.error(e);
      setRowActionMsg(
        e?.message || "No se pudo eliminar el equipo seleccionado",
      );
    }
  }

  /* ========= Copiar serial ========= */

  function handleCopySerial(serial: string) {
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {
        navigator.clipboard.writeText(serial);
      } else if (typeof document !== "undefined") {
        const textarea = document.createElement("textarea");
        textarea.value = serial;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setRowActionMsg("Serial copiado al portapapeles.");
    } catch (e) {
      console.error(e);
      setRowActionMsg("No se pudo copiar el serial.");
    }
  }

  /* ========= “Dueño” del activo (asignado / prestado) ========= */

  async function loadOwnerForAsset(params: { serial: string }) {
    const serial = (params.serial || "").trim();
    if (!serial) {
      setOwnerInfo(null);
      return;
    }

    setOwnerLoading(true);
    setOwnerInfo(null);

    // 1) Intentar con asignaciones
    try {
      const data = await fetchJSON("/api/assignments");
      const items: any[] = Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray(data)
          ? (data as any)
          : [];

      const active = items.find((x) => {
        const s = String(x?.assetSerial ?? x?.serial ?? "").trim();
        const st = String(x?.status ?? "").toUpperCase();
        return s === serial && st === "ASIGNADO";
      });

      if (active) {
        const collaboratorId = active?.collaboratorId
          ? String(active.collaboratorId)
          : undefined;
        const collaboratorName =
          (active?.collaboratorName ?? null) as string | null;

        const display = collaboratorName
          ? `Asignado a ${collaboratorName}${collaboratorId ? ` (${collaboratorId})` : ""}`
          : collaboratorId
            ? `Asignado a ${collaboratorId}`
            : "Asignado (sin colaborador detectado)";

        setOwnerInfo({
          kind: "ASSIGNMENT",
          collaboratorId,
          collaboratorName,
          display,
        });
        return;
      }
    } catch (e) {
      // No bloqueamos el modal si falla esta consulta.
      console.error("No se pudo cargar /api/assignments", e);
    }

    // 2) Intentar con préstamos (si existe endpoint /api/loans)
    try {
      const data = await fetchJSON("/api/loans");
      const items: any[] = Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray(data)
          ? (data as any)
          : [];

      // Heurística flexible (porque el shape exacto puede variar)
      const active = items.find((x) => {
        const s = String(
          x?.assetSerial ?? x?.serial ?? x?.asset?.serial ?? "",
        ).trim();
        if (s !== serial) return false;

        const returnedAt = x?.returnedAt ?? x?.returnDate ?? null;
        if (returnedAt) return false;

        const st = String(x?.status ?? "").toUpperCase();
        // Si hay status y no es "DEVUELTO", lo tomamos como activo.
        if (st) return st !== "DEVUELTO" && st !== "RETURNED";

        // Si no hay status, consideramos activo si no hay returnedAt
        return true;
      });

      if (active) {
        const collaboratorId = active?.collaboratorId
          ? String(active.collaboratorId)
          : active?.borrowerId
            ? String(active.borrowerId)
            : undefined;

        const collaboratorName =
          (active?.collaboratorName ??
            active?.borrowerName ??
            null) as string | null;

        const display = collaboratorName
          ? `Prestado a ${collaboratorName}${collaboratorId ? ` (${collaboratorId})` : ""}`
          : collaboratorId
            ? `Prestado a ${collaboratorId}`
            : "Prestado (sin colaborador detectado)";

        setOwnerInfo({
          kind: "LOAN",
          collaboratorId,
          collaboratorName,
          display,
        });
        return;
      }
    } catch (e) {
      // Si no existe /api/loans o falla, lo ignoramos.
      console.error("No se pudo cargar /api/loans (opcional)", e);
    }

    setOwnerInfo(null);
    setOwnerLoading(false);
  }

  /* ========= Modal ========= */

  function openModal(asset: AssetRow) {
    setModalAssetId(asset.id);
    setModalStatus(asset.status);
    setModalOlderThan3(asset.olderThan3Years);

    // Cargar “a quién está asignado/prestado” (best-effort)
    setOwnerInfo(null);
    setOwnerLoading(true);
    void loadOwnerForAsset({ serial: asset.serial }).finally(() => {
      setOwnerLoading(false);
    });
  }

  function closeModal() {
    setModalAssetId(null);
    setOwnerInfo(null);
    setOwnerLoading(false);
  }

  async function handleSaveModal() {
    if (!currentModalAsset || modalAssetId == null) return;

    try {
      await updateRow(modalAssetId, {
        olderThan3Years: modalOlderThan3,
      });
      setRowActionMsg("Cambios guardados correctamente.");
      closeModal();
    } catch {
      // el updateRow ya setea el mensaje de error
    }
  }

  function handleGoToCollaborator() {
    if (!ownerInfo?.collaboratorId) return;
    closeModal();
    router.push(`/equipo/assignments/${encodeURIComponent(ownerInfo.collaboratorId)}`);
  }

  /* ========= Stats (solo presentación) ========= */

  const { totalActivos, enUso, mantenimiento } = useMemo(() => {
    const total = rows.length;
    let uso = 0;
    let mant = 0;

    for (const r of rows) {
      if (r.status === "ASIGNADO") uso += 1;
      if (r.status === "BAJA") mant += 1;
    }

    return { totalActivos: total, enUso: uso, mantenimiento: mant };
  }, [rows]);

  /* ========= Render ========= */

  const statusPills: { label: string; value: string }[] = [
    { label: "Todos", value: "" },
    { label: "Activo", value: "ALTA" },
    { label: "Asignado", value: "ASIGNADO" },
    { label: "Transf.", value: "TRANSFERENCIA_PENDIENTE" },
    { label: "Desactivado", value: "BAJA" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Header principal */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventario de activos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona y rastrea el equipo de los hoteles.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/inventory/capture")}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo activo
          </button>
        </div>
      </header>

      {/* Tarjetas de resumen */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total activos
            </p>
            <h3 className="text-2xl font-bold text-slate-900">
              {totalActivos}
            </h3>
          </div>
          <div className="rounded-lg bg-slate-100 p-3 text-slate-600">
            <Monitor size={24} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              En uso
            </p>
            <h3 className="text-2xl font-bold text-emerald-600">{enUso}</h3>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
            <Cpu size={24} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Mantenimiento
            </p>
            <h3 className="text-2xl font-bold text-rose-600">
              {mantenimiento}
            </h3>
          </div>
          <div className="rounded-lg bg-rose-50 p-3 text-rose-600">
            <Headphones size={24} />
          </div>
        </div>
      </section>

      {/* Barra de búsqueda + filtros de estatus */}
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por serial, marca, modelo…"
            className="w-full rounded-xl border border-transparent bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro de estado */}
          <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600">
            {statusPills.map((pill) => (
              <button
                key={pill.value || "ALL"}
                type="button"
                onClick={() => setStatusFilter(pill.value)}
                className={`px-3 py-1.5 rounded-md transition-all ${statusFilter === pill.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Filtro de hotel */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                value={hotelFilter}
                onChange={(e) => setHotelFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Todos los hoteles</option>
                {hotels.map((h) => (
                  <option key={h.id} value={String(h.id)}>
                    {h.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Tarjeta: Importar por código */}
      <section className="max-w-md">
        <form
          onSubmit={handleImport}
          className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-3"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Importar por código
            </label>
            <input
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder="ABC123"
              className="
                w-full rounded-lg border px-3 py-2 text-sm
                bg-white text-slate-900 placeholder:text-slate-400
                border-slate-300
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
              "
            />
          </div>
          <button
            type="submit"
            disabled={importLoading || !importCode.trim()}
            className="
              inline-flex items-center justify-center
              px-3 py-2 text-sm font-medium rounded-lg
              bg-slate-900 text-white
              hover:bg-slate-800
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {importLoading ? "Importando…" : "Importar"}
          </button>
          {importMsg && (
            <span className="text-sm text-slate-700">{importMsg}</span>
          )}
        </form>
      </section>

      {/* Mensajes */}
      {rowActionMsg && <p className="text-sm text-slate-700">{rowActionMsg}</p>}

      {/* Tabla de activos */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="px-6 py-4 text-left">Activo / Serial</th>
                <th className="px-6 py-4 text-left">Estado</th>
                <th className="px-6 py-4 text-left">
                  Detalles (Marca/Modelo)
                </th>
                <th className="px-6 py-4 text-left">Ubicación</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center">
                    Cargando…
                  </td>
                </tr>
              )}
              {err && !loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-6 text-center text-red-600"
                  >
                    {err}
                  </td>
                </tr>
              )}
              {!loading &&
                !err &&
                rows.map((a) => (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Activo / Serial */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <AssetTypeIcon label={a.typeLabel} />
                        <div>
                          <p className="font-medium text-slate-900">
                            {a.typeLabel || "Activo"}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <p className="text-xs text-slate-500 font-mono">
                              {a.serial}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleCopySerial(a.serial)}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                            >
                              Copiar código
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      <span
                        className={
                          "inline-flex items-center justify-center " +
                          getStatusClasses(a.status)
                        }
                      >
                        {getStatusLabel(a.status)}
                      </span>
                    </td>

                    {/* Detalles marca / modelo */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">
                          {a.brandLabel}
                        </span>
                        <span className="text-sm text-slate-500">
                          {a.modelLabel}
                        </span>
                      </div>
                    </td>

                    {/* Ubicación */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin size={14} className="text-slate-400" />
                        <span>{a.hotelLabel}</span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openModal(a)}
                          className="
                            inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium
                            border border-slate-300 bg-white text-slate-700
                            hover:bg-slate-50
                          "
                        >
                          Ver / editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a.id)}
                          className="
                            inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium
                            border border-rose-200 text-rose-600
                            hover:bg-rose-50
                          "
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && !err && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalle / edición */}
      {currentModalAsset && modalAssetId !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          {/* ↑ Aumentamos el tamaño para tener espacio (max-w-3xl) */}
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Detalle del equipo
                  </h3>
                  <span
                    className={
                      "inline-flex items-center justify-center " +
                      getStatusClasses(currentModalAsset.status)
                    }
                  >
                    {getStatusLabel(currentModalAsset.status)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-xs text-slate-500 font-mono">
                    Serial: {currentModalAsset.serial}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopySerial(currentModalAsset.serial)}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                  >
                    Copiar código
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="px-4 py-4 space-y-4 text-xs">
              {/* Aviso y accesos rápidos */}
              <div className="flex flex-col gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600 md:flex-row md:items-center md:justify-between">
                <p className="md:max-w-xl">
                  Desde este visor solo se guardan detalles administrativos
                  (años y factura). Para cambios operativos usa las otras
                  pantallas.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      closeModal();
                      router.push(
                        `/assignments?assetId=${currentModalAsset.id}`,
                      );
                    }}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                  >
                    Ir a asignaciones
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      closeModal();
                      router.push(`/disposals?assetId=${currentModalAsset.id}`);
                    }}
                    className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Ir a bajas
                  </button>
                </div>
              </div>

              {/* NUEVO: bloque de “Asignado / Prestado a…” */}
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Resguardo / Préstamo
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {ownerLoading ? (
                        <span className="text-slate-500">
                          Cargando información…
                        </span>
                      ) : ownerInfo ? (
                        <span>{ownerInfo.display}</span>
                      ) : (
                        <span className="text-slate-500">
                          Sin asignación o préstamo activo detectado.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleGoToCollaborator}
                      disabled={!ownerInfo?.collaboratorId}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        ownerInfo?.collaboratorId
                          ? "Abrir resguardo del colaborador"
                          : "No se detectó colaborador"
                      }
                    >
                      Ver colaborador
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenido principal en 2 columnas (mejor orden) */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Columna izquierda: datos del activo */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Tipo
                      </div>
                      <div className="text-slate-900">
                        {currentModalAsset.typeLabel}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Marca
                      </div>
                      <div className="text-slate-900">
                        {currentModalAsset.brandLabel}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Modelo
                      </div>
                      <div className="text-slate-900">
                        {currentModalAsset.modelLabel}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Hotel
                      </div>
                      <div className="text-slate-900">
                        {currentModalAsset.hotelLabel}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Estatus
                    </div>
                    <select
                      value={modalStatus}
                      onChange={(e) =>
                        setModalStatus(e.target.value as AssetStatus)
                      }
                      disabled
                      className="
                        w-full rounded-md border px-2 py-1 text-xs
                        border-slate-200 bg-slate-50 text-slate-500
                        cursor-not-allowed
                      "
                    >
                      <option value="ALTA">ALTA</option>
                      <option value="ASIGNADO">ASIGNADO</option>
                      <option value="TRANSFERENCIA_PENDIENTE">
                        TRANSFERENCIA_PENDIENTE
                      </option>
                      <option value="BAJA">BAJA</option>
                    </select>
                    <p className="text-[10px] text-slate-500">
                      Para cambiar el estatus usa las pantallas de{" "}
                      <span className="font-semibold">Asignaciones</span> o{" "}
                      <span className="font-semibold">Bajas</span>.
                    </p>
                  </div>
                </div>

                {/* Columna derecha: +3 años y factura */}
                <div className="space-y-4">
                  <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
                    <label className="inline-flex items-start gap-2 text-xs text-slate-800">
                      <input
                        type="checkbox"
                        checked={modalOlderThan3}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setModalOlderThan3(checked);
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <span>
                        Equipo con{" "}
                        <span className="font-semibold">+3 años</span> (factura
                        antigua)
                      </span>
                    </label>

                    <div className="rounded-md bg-white/70 px-3 py-2 text-[11px] text-slate-700">
                      {modalOlderThan3 ? (
                        <>
                          <p className="font-semibold text-slate-800">
                            Marcado como mayor a 3 años
                          </p>
                          <p className="mt-0.5">
                            Para este equipo no es obligatorio consultar la
                            factura desde el sistema. Se mantiene solo como
                            referencia histórica.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-slate-800">
                            Información de factura
                          </p>
                          {currentModalAsset.invoiceNumber ||
                            currentModalAsset.invoiceDate ? (
                            <p className="mt-0.5">
                              {currentModalAsset.invoiceNumber && (
                                <>
                                  Folio:{" "}
                                  <span className="font-mono">
                                    {currentModalAsset.invoiceNumber}
                                  </span>
                                </>
                              )}
                              {currentModalAsset.invoiceNumber &&
                                currentModalAsset.invoiceDate &&
                                " • "}
                              {currentModalAsset.invoiceDate && (
                                <>
                                  Fecha:{" "}
                                  <span className="font-medium">
                                    {formatInvoiceDate(
                                      currentModalAsset.invoiceDate,
                                    )}
                                  </span>
                                </>
                              )}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-slate-500">
                              Sin factura registrada para este equipo. Si la
                              capturaste desde Inventario, se mostrará aquí.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <button
                type="button"
                onClick={closeModal}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                className="
                  inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold
                  bg-slate-900 text-white hover:bg-slate-800
                "
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
