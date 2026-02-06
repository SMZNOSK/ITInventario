// src/app/(app)/catalog/storage/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { Database, RefreshCw, Plus, Trash2, Search } from "lucide-react";

type StorageApi = {
  id: number;
  name: string;
  vendor?: string | null;
  isActive?: boolean | null;
};

type StorageRow = {
  id: number;
  name: string;
  vendor: string;
  active: boolean;
};

export default function StoragePage() {
  const { fetchJSON } = useAuth();

  const [rows, setRows] = useState<StorageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      const data = await fetchJSON<{ items: StorageApi[] }>("/api/catalog/storage");
      const items = Array.isArray(data?.items) ? data.items : [];

      setRows(
        items.map((s) => ({
          id: s.id,
          name: s.name || "",
          vendor: s.vendor || "",
          active: s.isActive ?? true,
        })),
      );
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Error al cargar almacenamiento");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    const cleanName = name.trim();
    const cleanVendor = vendor.trim();
    if (!cleanName) return;

    try {
      setBusy(true);
      setErr(null);

      const body: any = {
        name: cleanName,
        nombre: cleanName,
        nombre_storage: cleanName,
      };
      if (cleanVendor) body.vendor = cleanVendor;

      const res = await fetch("/api/catalog/storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      setName("");
      setVendor("");
      await load();
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No se pudo crear la capacidad");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: StorageRow) {
    try {
      setErr(null);

      const res = await fetch("/api/catalog/storage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          active: !row.active,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, active: !row.active } : r,
        ),
      );
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No se pudo actualizar el estatus");
    }
  }

  async function handleDelete(row: StorageRow) {
    const confirm = window.confirm(
      `¿Eliminar definitivamente la capacidad "${row.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirm) return;

    try {
      setErr(null);

      const res = await fetch("/api/catalog/storage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || data?.message || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "No se pudo eliminar la capacidad");
    }
  }

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.vendor.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Database className="w-7 h-7 text-indigo-600" />
            Almacenamiento interno
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra las capacidades de almacenamiento que se podrán asignar a CPUs y laptops en el inventario.
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
      {err && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {/* Formulario de creación */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Agregar nueva capacidad de almacenamiento
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              placeholder="Capacidad / descripción"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              placeholder="Proveedor / fabricante (opcional)"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={busy || !name.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {busy ? "Guardando..." : "Agregar"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Estos valores se usarán más adelante al capturar inventario de CPUs y laptops.
        </p>
      </section>

      {/* Lista */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Lista de Capacidades
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredRows.length} {filteredRows.length === 1 ? "capacidad" : "capacidades"} registradas
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
              <p className="mt-2 text-sm text-slate-500">Cargando almacenamiento...</p>
            </div>
          )}

          {!loading && filteredRows.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Database className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-slate-600">Sin capacidades</h3>
              <p className="mt-1 text-sm text-slate-500">
                {search.trim() ? "No hay capacidades que coincidan con la búsqueda." : "Agrega tu primera capacidad arriba."}
              </p>
            </div>
          )}

          {!loading && filteredRows.map((row) => (
            <div key={row.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-800">{row.name}</span>
                  {row.vendor && (
                    <p className="mt-0.5 text-xs text-slate-500">{row.vendor}</p>
                  )}
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${row.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {row.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(row)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ${row.active
                      ? "text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
                      : "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                    }`}
                >
                  {row.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => handleDelete(row)}
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
