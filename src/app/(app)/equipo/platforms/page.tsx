"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { Server, RefreshCw, Plus, Edit, Trash2, Search, Check, X } from "lucide-react";

type Platform = {
  id: number;
  name: string;
  isActive: boolean;
};

export default function PlatformsPage() {
  const { fetchJSON } = useAuth();

  const [items, setItems] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [newName, setNewName] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [rowMsg, setRowMsg] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await fetchJSON<{ items: Platform[] }>("/api/catalog/platforms");
      const arr = Array.isArray((data as any)?.items) ? ((data as any).items as Platform[]) : []
      setItems(arr);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Error al cargar plataformas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    try {
      setSavingNew(true);
      setRowMsg(null);

      const res = await fetch("/api/catalog/platforms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      }

      setNewName("");
      await load();
    } catch (e: any) {
      console.error(e);
      setRowMsg(e?.message || "No se pudo crear la plataforma");
    } finally {
      setSavingNew(false);
    }
  }

  async function handleToggleActive(p: Platform) {
    try {
      setRowMsg(null);
      const res = await fetch(`/api/catalog/platforms/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (e: any) {
      console.error(e);
      setRowMsg(e?.message || "No se pudo actualizar la plataforma");
    }
  }

  async function handleDelete(p: Platform) {
    const ok = window.confirm(
      `¿Eliminar la plataforma "${p.name}"?\nAsegúrate de que no tenga asignaciones.`,
    );
    if (!ok) return;

    try {
      setRowMsg(null);
      const res = await fetch(`/api/catalog/platforms/${p.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (e: any) {
      console.error(e);
      setRowMsg(e?.message || "No se pudo eliminar la plataforma");
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) return;

    try {
      setRowMsg(null);
      const res = await fetch(`/api/catalog/platforms/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data && data.error)) {
        throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      console.error(e);
      setRowMsg(e?.message || "No se pudo editar la plataforma");
    }
  }

  const filteredItems = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => p.name.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Server className="w-7 h-7 text-indigo-600" />
            Plataformas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Catálogo de plataformas donde se ejecutan los equipos (Citrix, local, escritorio virtual, etc.).
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

      {/* Error / Messages */}
      {err && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {err}
        </div>
      )}
      {rowMsg && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {rowMsg}
        </div>
      )}

      {/* Formulario de creación */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Agregar nueva plataforma
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              placeholder="Nombre de la plataforma"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={savingNew || !newName.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {savingNew ? "Guardando..." : "Agregar"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Ej. APP CITRIX 2013, APP LOCAL, ESCRITORIO VIRTUAL...
        </p>
      </section>

      {/* Lista */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Lista de Plataformas
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredItems.length} {filteredItems.length === 1 ? "plataforma" : "plataformas"} registradas
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
              <p className="mt-2 text-sm text-slate-500">Cargando plataformas...</p>
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Server className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-slate-600">Sin plataformas</h3>
              <p className="mt-1 text-sm text-slate-500">
                {search.trim() ? "No hay plataformas que coincidan con la búsqueda." : "Agrega tu primera plataforma arriba."}
              </p>
            </div>
          )}

          {!loading && filteredItems.map((p) => {
            const isEditing = editing?.id === p.id;
            return (
              <div key={p.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Server className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={editing?.name ?? ""}
                        onChange={(e) => setEditing({ id: p.id, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") setEditing(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="text-sm font-medium text-slate-800">{p.name}</span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${p.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                            }`}
                        >
                          {p.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditing({ id: p.id, name: p.name })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ${p.isActive
                            ? "text-slate-700 bg-white border border-slate-200 hover:bg-slate-50"
                            : "text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                          }`}
                      >
                        {p.isActive ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
