// src/app/_ui/AssetPickerModal.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/providers";
import { X, ChevronLeft, ChevronRight, ListFilter } from "lucide-react";

export type AssetRow = {
  id: number;
  code: string;
  serial: string | null;

  // Forma "flatten"
  typeName: string;
  brandName: string;
  modelName: string;

  // Formas alternas
  typeCode?: string | null;
  type?:
    | {
        code?: string | null;
        name?: string | null;
      }
    | string
    | null;
  brand?: { name?: string | null } | string | null;
  model?: { name?: string | null } | string | null;
};

type Filters = {
  type: string;
  brand: string;
  model: string;
  serial: string;
};

type AssetsResponse = {
  items: AssetRow[];
  page: number;
  totalPages: number;
  total: number;
};

type AssetPickerModalProps = {
  // Soporta ambas variantes para no romper pantallas viejas
  open?: boolean;
  isOpen?: boolean;

  // Cierre
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;

  // Selección (alias)
  onSelect?: (asset: AssetRow) => void;
  onPick?: (asset: AssetRow) => void;
  onChoose?: (asset: AssetRow) => void;

  // opcionales
  subtitle?: string;
  actionLabel?: string;
  busy?: boolean;
  externalError?: string | null;
};

const INITIAL_FILTERS: Filters = {
  type: "",
  brand: "",
  model: "",
  serial: "",
};

function safeLower(v: any): string {
  return String(v ?? "").toLowerCase();
}

function getTypeLabel(asset: AssetRow): string {
  const fromType =
    typeof asset.type === "string"
      ? asset.type
      : asset.type?.code ?? asset.type?.name ?? null;

  return (
    asset.typeName?.trim() ||
    fromType?.trim() ||
    asset.typeCode?.trim() ||
    asset.code?.trim() ||
    `#${asset.id}`
  );
}

function getBrandLabel(asset: AssetRow): string {
  const fromBrand =
    typeof asset.brand === "string" ? asset.brand : asset.brand?.name ?? null;

  return asset.brandName?.trim() || fromBrand?.trim() || "—";
}

function getModelLabel(asset: AssetRow): string {
  const fromModel =
    typeof asset.model === "string" ? asset.model : asset.model?.name ?? null;

  return asset.modelName?.trim() || fromModel?.trim() || "—";
}

export function AssetPickerModal({
  open,
  isOpen,
  onClose,
  onOpenChange,
  onSelect,
  onPick,
  onChoose,
  subtitle = "Selecciona un equipo disponible para asignar.",
  actionLabel = "Usar este equipo",
  busy = false,
  externalError = null,
}: AssetPickerModalProps) {
  const { fetchJSON } = useAuth();

  const resolvedOpen = Boolean(open ?? isOpen);

  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AssetRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // error interno del modal (carga)
  const [error, setError] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    if (busy) return;
    onClose?.();
    onOpenChange?.(false);
  }, [busy, onClose, onOpenChange]);

  const fireSelect = useCallback(
    (asset: AssetRow) => {
      if (busy) return;
      const fn = onSelect ?? onPick ?? onChoose;
      fn?.(asset);
    },
    [busy, onSelect, onPick, onChoose],
  );

  const load = useCallback(
    async (pageToLoad: number, filtersToUse?: Filters) => {
      const f = filtersToUse ?? filters;

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(pageToLoad));

        // recomendado: traer más por página para que el filtro sea útil sin paginar tanto
        params.set("pageSize", "200");

        // Enviamos filtros por si el backend los soporta,
        // PERO igual filtramos en frontend.
        if (f.type.trim()) params.set("type", f.type.trim());
        if (f.brand.trim()) params.set("brand", f.brand.trim());
        if (f.model.trim()) params.set("model", f.model.trim());
        if (f.serial.trim()) params.set("serial", f.serial.trim());

        const url = `/api/assets/available?${params.toString()}`;
        const data = (await fetchJSON(url)) as AssetsResponse;

        const nextItems = Array.isArray(data?.items) ? data.items : [];
        setItems(nextItems);
        setPage(typeof data?.page === "number" ? data.page : pageToLoad);
        setTotalPages(typeof data?.totalPages === "number" ? data.totalPages : 1);
        setTotal(typeof data?.total === "number" ? data.total : nextItems.length);
      } catch (err: any) {
        console.error("Error al cargar activos disponibles", err);
        setError(err?.message || "No se pudo cargar la lista de activos disponibles.");
        setItems([]);
        setPage(1);
        setTotalPages(1);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [fetchJSON, filters],
  );

  // cargar al abrir
  useEffect(() => {
    if (resolvedOpen) void load(1);
  }, [resolvedOpen, load]);

  // bloquear scroll
  useEffect(() => {
    if (!resolvedOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [resolvedOpen]);

  // ESC
  useEffect(() => {
    if (!resolvedOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resolvedOpen, closeModal]);

  // ✅ filtro local SIEMPRE (por si backend ignora params)
  const filteredItems = useMemo(() => {
    const qType = filters.type.trim().toLowerCase();
    const qBrand = filters.brand.trim().toLowerCase();
    const qModel = filters.model.trim().toLowerCase();
    const qSerial = filters.serial.trim().toLowerCase();

    if (!qType && !qBrand && !qModel && !qSerial) return items;

    return items.filter((asset) => {
      const typeLabel = safeLower(getTypeLabel(asset));
      const brandLabel = safeLower(getBrandLabel(asset));
      const modelLabel = safeLower(getModelLabel(asset));
      const serialLabel = safeLower(asset.serial);
      const codeLabel = safeLower(asset.code);

      const matchType =
        !qType ||
        typeLabel.includes(qType) ||
        codeLabel.includes(qType) ||
        serialLabel.includes(qType) ||
        brandLabel.includes(qType) ||
        modelLabel.includes(qType);

      const matchBrand =
        !qBrand ||
        brandLabel.includes(qBrand) ||
        typeLabel.includes(qBrand) ||
        modelLabel.includes(qBrand) ||
        codeLabel.includes(qBrand) ||
        serialLabel.includes(qBrand);

      const matchModel =
        !qModel ||
        modelLabel.includes(qModel) ||
        typeLabel.includes(qModel) ||
        brandLabel.includes(qModel) ||
        codeLabel.includes(qModel) ||
        serialLabel.includes(qModel);

      const matchSerial =
        !qSerial ||
        serialLabel.includes(qSerial) ||
        codeLabel.includes(qSerial) ||
        typeLabel.includes(qSerial) ||
        brandLabel.includes(qSerial) ||
        modelLabel.includes(qSerial);

      return matchType && matchBrand && matchModel && matchSerial;
    });
  }, [items, filters]);

  // IMPORTANTE: early-return DESPUÉS de TODOS los hooks
  if (!resolvedOpen) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const handleBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (busy) return;
    if (e.target === e.currentTarget) closeModal();
  };

  const handleChange =
    (field: keyof Filters) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSearch = () => {
    void load(1);
  };

  const handleClear = () => {
    setFilters(INITIAL_FILTERS);
    void load(1, INITIAL_FILTERS);
  };

  const footerText = `Viendo página ${page} de ${totalPages} • ${total} resultados`;

  const shownCountText =
    filteredItems.length !== items.length
      ? `Mostrando ${filteredItems.length} de ${items.length} (filtro aplicado)`
      : null;

  const displayError = externalError || error;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-6 overscroll-contain"
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="min-h-full w-full flex items-start justify-center sm:items-center">
        <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl max-h-[85vh] flex flex-col min-h-0">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                CAPTURA DE INVENTARIO
              </h2>
              <p className="text-xs text-slate-500">{subtitle}</p>
              {shownCountText && (
                <p className="mt-1 text-[11px] text-slate-400">{shownCountText}</p>
              )}
            </div>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              aria-label="Cerrar"
              disabled={busy}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Filtros */}
          <div className="shrink-0 border-b border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[160px] space-y-1">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Filtrar por tipo
                </p>
                <input
                  type="text"
                  placeholder='Ej. "LAP", "CPU", "RAD"...'
                  value={filters.type}
                  onChange={handleChange("type")}
                  className="h-9 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#254D6E] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex-1 min-w-[140px] space-y-1">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Marca
                </p>
                <input
                  type="text"
                  placeholder="Ej. DELL"
                  value={filters.brand}
                  onChange={handleChange("brand")}
                  className="h-9 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#254D6E] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex-1 min-w-[160px] space-y-1">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Modelo
                </p>
                <input
                  type="text"
                  placeholder="Ej. XPS 13"
                  value={filters.model}
                  onChange={handleChange("model")}
                  className="h-9 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#254D6E] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex-1 min-w-[180px] space-y-1">
                <p className="text-[11px] font-semibold uppercase text-slate-500">
                  Número de serie
                </p>
                <input
                  type="text"
                  placeholder="Buscar por serie..."
                  value={filters.serial}
                  onChange={handleChange("serial")}
                  className="h-9 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#254D6E] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={busy || loading}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={busy || loading}
                  className="inline-flex items-center gap-1 rounded-2xl bg-[#0f172a] px-4 py-2 text-[11px] font-semibold text-white shadow-sm hover:bg-[#020617] disabled:opacity-50"
                >
                  <ListFilter className="h-3 w-3" />
                  Buscar
                </button>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="flex-1 min-h-0 overflow-auto">
            {displayError && (
              <div className="px-4 py-3 text-xs text-rose-700">{displayError}</div>
            )}

            <table className="min-w-full border-separate border-spacing-0 text-left text-xs">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Tipo
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Marca
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Modelo
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Número de serie / ID
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-10 text-center text-[11px] text-slate-500"
                    >
                      No se encontraron activos con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((asset) => {
                    const typeLabel = getTypeLabel(asset);
                    const brandLabel = getBrandLabel(asset);
                    const modelLabel = getModelLabel(asset);
                    const serialLabel = asset.serial?.trim() || "";

                    return (
                      <tr
                        key={asset.id}
                        className="border-b border-slate-100 text-[11px] text-slate-800 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          {typeLabel}
                        </td>
                        <td className="px-3 py-2">{brandLabel}</td>
                        <td className="px-3 py-2">{modelLabel}</td>
                        <td className="px-3 py-2">
                          {serialLabel ? (
                            <div className="leading-4">
                              <div className="font-medium font-mono text-slate-900">
                                {serialLabel}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {asset.code}
                              </div>
                            </div>
                          ) : (
                            <div className="leading-4">
                              <div className="font-medium">{asset.code}</div>
                              <div className="text-[10px] text-slate-400">
                                Sin serie
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => fireSelect(asset)}
                            className="rounded-full bg-amber-400 px-4 py-1 text-[11px] font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
                          >
                            {busy ? "Procesando..." : actionLabel}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {loading && (
              <div className="px-4 py-3 text-[11px] text-slate-500">
                Cargando activos...
              </div>
            )}
          </div>

          {/* Paginación */}
          <div className="shrink-0 flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
            <p>{`Viendo página ${page} de ${totalPages} • ${total} resultados`}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!canPrev || busy || loading}
                onClick={() => canPrev && load(page - 1)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 disabled:opacity-40"
              >
                <ChevronLeft className="h-3 w-3" />
                Anterior
              </button>
              <button
                type="button"
                disabled={!canNext || busy || loading}
                onClick={() => canNext && load(page + 1)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ para que funcione: import AssetPickerModal from "@/app/_ui/AssetPickerModal";
export default AssetPickerModal;
