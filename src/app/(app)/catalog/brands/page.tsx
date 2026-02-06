//src/app/(app)/catalog/brands/page.tsx
"use client";

import * as React from "react";
import { Catalog } from "@/lib/api";
import { Tag, RefreshCw, Plus, Edit, Trash2, Search } from "lucide-react";

type Marca = { id: number; name: string };

export default function BrandsPage() {
  const [items, setItems] = React.useState<Marca[]>([]);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await Catalog.listBrands();
      setItems(res.items ?? []);
    } catch (e: any) {
      setError(e?.message || "Error al cargar marcas");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function onCreate() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    setError(null);
    try {
      await Catalog.createBrand(n);
      setName("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Error al crear marca");
    } finally {
      setBusy(false);
    }
  }

  async function onRename(id: number, current: string) {
    const next = prompt("Nuevo nombre:", current);
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === current) return;
    try {
      await Catalog.updateBrand(id, trimmed);
      await load();
    } catch (e: any) {
      setError(e?.message || "Error al renombrar marca");
    }
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar marca?")) return;
    try {
      await Catalog.deleteBrand(id);
      await load();
    } catch (e: any) {
      setError(e?.message || "Error al eliminar marca");
    }
  }

  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => m.name.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Tag className="w-7 h-7 text-indigo-600" />
            Marcas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra la lista de marcas del inventario.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Formulario de creación */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Agregar nueva marca
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              placeholder="Nombre de la marca"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreate()}
            />
          </div>
          <button
            onClick={onCreate}
            disabled={busy || !name.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {busy ? "Guardando..." : "Agregar"}
          </button>
        </div>
      </section>

      {/* Lista */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Lista de Marcas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredItems.length} {filteredItems.length === 1 ? "marca" : "marcas"} registradas
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading && (
            <div className="px-6 py-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
              <p className="mt-2 text-sm text-slate-500">Cargando marcas...</p>
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Tag className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-slate-600">Sin marcas</h3>
              <p className="mt-1 text-sm text-slate-500">
                {search.trim() ? "No hay marcas que coincidan con la búsqueda." : "Agrega tu primera marca arriba."}
              </p>
            </div>
          )}

          {!loading && filteredItems.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Tag className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-800">{m.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRename(m.id, m.name)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Renombrar
                </button>
                <button
                  onClick={() => onDelete(m.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
