// src/app/(app)/catalog/models/page.tsx
"use client";

import * as React from "react";
import { Catalog, ModelItem, TypeItem, BrandItem } from "@/lib/api";
import {
  Box,
  RefreshCw,
  Plus,
  Search,
  Power,
  Trash2,
  ChevronDown,
} from "lucide-react";

type ModeloView = ModelItem & {
  typeName?: string | null;
  brandName?: string | null;
};

/* ===== Helpers de fetch ===== */

async function fetchTypes(): Promise<TypeItem[]> {
  const res = await fetch("/api/catalog/types/activos", {
    headers: { Accept: "application/json" },
  });
  const data = (await res.json().catch(() => null)) as any;
  const tipos =
    (data?.tipos as TypeItem[] | undefined) ??
    (data?.items as TypeItem[] | undefined) ??
    [];
  return Array.isArray(tipos) ? tipos : [];
}

async function fetchBrands(): Promise<BrandItem[]> {
  const res = await fetch("/api/catalog/brands", {
    headers: { Accept: "application/json" },
  });
  const data = (await res.json().catch(() => null)) as any;
  const brands =
    (data?.items as BrandItem[] | undefined) ??
    (data?.brands as BrandItem[] | undefined) ??
    (data?.marcas as BrandItem[] | undefined) ??
    [];
  return Array.isArray(brands) ? brands : [];
}

async function fetchModels(): Promise<ModelItem[]> {
  const res = await fetch("/api/catalog/models", {
    headers: { Accept: "application/json" },
  });
  const data = (await res.json().catch(() => null)) as any;
  const models =
    (data?.items as ModelItem[] | undefined) ??
    (data?.models as ModelItem[] | undefined) ??
    (data?.data as ModelItem[] | undefined) ??
    [];
  return Array.isArray(models) ? models : [];
}

function mapModels(
  models: ModelItem[],
  tipos: TypeItem[],
  marcas: BrandItem[]
): ModeloView[] {
  const byType = new Map(tipos.map((t) => [t.id, t.name]));
  const byBrand = new Map(marcas.map((b) => [b.id, b.name]));

  return models.map((x) => ({
    ...x,
    typeName: byType.get(Number((x as any).typeId ?? -1)) ?? null,
    brandName: byBrand.get(Number((x as any).brandId ?? -1)) ?? null,
  }));
}

export default function ModelsPage() {
  const [tipos, setTipos] = React.useState<TypeItem[]>([]);
  const [marcas, setMarcas] = React.useState<BrandItem[]>([]);
  const [items, setItems] = React.useState<ModeloView[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [nombre, setNombre] = React.useState("");
  const [tipoId, setTipoId] = React.useState<number | "">("");
  const [marcaId, setMarcaId] = React.useState<number | "">("");
  const [search, setSearch] = React.useState("");

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* ========== CARGA INICIAL ========== */
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [t, b, m] = await Promise.all([
          fetchTypes(),
          fetchBrands(),
          fetchModels(),
        ]);
        setTipos(t);
        setMarcas(b);
        setItems(mapModels(m, t, b));
      } catch (e: any) {
        console.error("Error al cargar modelos", e);
        setError(e?.message || "Error al cargar modelos");
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ========== RELOAD ========== */
  async function reloadModels() {
    try {
      const m = await fetchModels();
      setItems(mapModels(m, tipos, marcas));
    } catch (e: any) {
      console.error("Error al recargar modelos", e);
      setError(e?.message || "Error al recargar modelos");
    }
  }

  async function reload() {
    setLoading(true);
    try {
      const [t, b, m] = await Promise.all([fetchTypes(), fetchBrands(), fetchModels()]);
      setTipos(t);
      setMarcas(b);
      setItems(mapModels(m, t, b));
    } catch (e: any) {
      setError(e?.message || "Error al recargar");
    } finally {
      setLoading(false);
    }
  }

  /* ========== CREAR ========== */
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    if (!n || tipoId === "" || marcaId === "") return;

    setBusy(true);
    setError(null);
    try {
      await Catalog.createModel(n, Number(tipoId), Number(marcaId));
      setNombre("");
      setTipoId("");
      setMarcaId("");
      await reloadModels();
    } catch (e: any) {
      console.error("Error al crear modelo", e);
      setError(e?.message || "No se pudo crear el modelo");
    } finally {
      setBusy(false);
    }
  }

  /* ========== TOGGLE ESTADO ========== */
  async function toggleEstado(m: ModeloView) {
    const current = (m.status ?? "ALTA").toUpperCase();
    const next: "ALTA" | "BAJA" = current === "BAJA" ? "ALTA" : "BAJA";

    try {
      setError(null);
      await Catalog.updateModelStatus(m.id, next);
      await reloadModels();
    } catch (e: any) {
      console.error("Error al actualizar estado del modelo", e);
      setError(e?.message || "Error al actualizar estado del modelo");
    }
  }

  /* ========== ELIMINAR ========== */
  async function handleDeleteModel(m: ModeloView) {
    const ok = window.confirm(
      `¿Eliminar el modelo "${m.name ?? `#${m.id}`}"?\n\n` +
      "Si el modelo está asociado a equipos, no se podrá borrar."
    );
    if (!ok) return;

    try {
      setError(null);
      const res = await fetch(`/api/catalog/models/${m.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error || data?.message || `Error HTTP ${res.status}`);
      }
      await reloadModels();
    } catch (e: any) {
      console.error("Error al eliminar modelo", e);
      setError(e?.message || "Error al eliminar el modelo");
    }
  }

  const canCreate = nombre.trim().length > 0 && tipoId !== "" && marcaId !== "" && !busy;

  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => {
      const text = [m.name, m.typeName, m.brandName].filter(Boolean).join(" ").toLowerCase();
      return text.includes(q);
    });
  }, [items, search]);

  const stats = React.useMemo(() => {
    const total = items.length;
    const activos = items.filter((m) => (m.status ?? "ALTA").toUpperCase() !== "BAJA").length;
    return { total, activos };
  }, [items]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Box className="w-7 h-7 text-violet-600" />
            Modelos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra los modelos de equipos del inventario.
          </p>
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Modelos
              </p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
            </div>
            <div className="p-3 bg-violet-50 rounded-lg text-violet-600">
              <Box className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Activos
              </p>
              <h3 className="text-2xl font-bold text-emerald-600">{stats.activos}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <Power className="w-6 h-6" />
            </div>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={onCreate} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Agregar nuevo modelo
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative">
            <input
              type="text"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-500"
              placeholder="Nombre del modelo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="w-full appearance-none px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-500 cursor-pointer"
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Tipo...</option>
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              className="w-full appearance-none px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-500 cursor-pointer"
              value={marcaId}
              onChange={(e) => setMarcaId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Marca...</option>
              {marcas.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={!canCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {busy ? "Guardando..." : "Agregar"}
          </button>
        </div>
      </form>

      {/* Lista */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Lista de Modelos
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredItems.length} modelos encontrados
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar modelo..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-100 focus:border-violet-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading && (
            <div className="px-6 py-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
              <p className="mt-2 text-sm text-slate-500">Cargando modelos...</p>
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Box className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-slate-600">Sin modelos</h3>
              <p className="mt-1 text-sm text-slate-500">
                {search.trim() ? "No hay modelos que coincidan." : "Agrega tu primer modelo arriba."}
              </p>
            </div>
          )}

          {!loading && filteredItems.map((m) => {
            const status = (m.status ?? "ALTA").toUpperCase();
            const activo = status !== "BAJA";

            return (
              <div key={m.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${activo ? "bg-violet-50 text-violet-600" : "bg-slate-100 text-slate-400"}`}>
                    <Box className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">
                        {m.name ?? `#${m.id}`}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${activo
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                          }`}
                      >
                        {activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {m.typeName || "—"} • {m.brandName || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleEstado(m)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${activo
                        ? "text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
                        : "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                      }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {activo ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => handleDeleteModel(m)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}