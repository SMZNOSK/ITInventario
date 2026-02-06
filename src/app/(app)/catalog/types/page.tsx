// src/app/(app)/catalog/types/page.tsx
"use client";

import * as React from "react";
import { Layers, RefreshCw, Plus, Edit, Trash2, Search, Check, X } from "lucide-react";

type Tipo = {
  id: number;
  name: string;
};

export default function TypesPage() {
  const [tipos, setTipos] = React.useState<Tipo[]>([]);
  const [nombre, setNombre] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [infoMsg, setInfoMsg] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  // edición inline
  const [editId, setEditId] = React.useState<number | null>(null);
  const [editNombre, setEditNombre] = React.useState("");

  /* ========== CARGAR LISTA COMPLETA ========== */
  async function loadTipos() {
    setLoading(true);
    setError(null);
    setInfoMsg(null);
    try {
      const res = await fetch("/api/catalog/types", {
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({} as any));

      const raw: any[] = Array.isArray((data as any).tipos)
        ? (data as any).tipos
        : Array.isArray((data as any).items)
          ? (data as any).items
          : Array.isArray(data)
            ? (data as any)
            : [];

      const list: Tipo[] = raw
        .filter((t) => t && typeof t.id === "number")
        .map((t) => ({
          id: t.id,
          name: String(t.name ?? "").trim() || `#${t.id}`,
        }))
        .sort((a, b) => a.id - b.id);

      setTipos(list);
    } catch (e: any) {
      console.error("Error al cargar tipos", e);
      setError(e?.message || "Error al cargar tipos");
      setTipos([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadTipos();
  }, []);

  /* ========== CREAR TIPO ========== */
  async function handleCreate() {
    const value = nombre.trim();
    if (!value || saving) return;

    setSaving(true);
    setError(null);
    setInfoMsg(null);

    try {
      const res = await fetch("/api/catalog/types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ nombre: value }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || data?.success === false) {
        const msg = data?.error || data?.message || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      setNombre("");
      setInfoMsg("Tipo creado correctamente.");
      await loadTipos();
    } catch (e: any) {
      console.error("Error al crear tipo", e);
      setError(e?.message || "No se pudo crear el tipo");
    } finally {
      setSaving(false);
    }
  }

  /* ========== INICIAR / CANCELAR EDICIÓN ========== */
  function startEdit(t: Tipo) {
    setEditId(t.id);
    setEditNombre(t.name);
    setInfoMsg(null);
    setError(null);
  }

  function cancelEdit() {
    setEditId(null);
    setEditNombre("");
  }

  /* ========== GUARDAR EDICIÓN ========== */
  async function handleSaveEdit() {
    if (editId == null) return;
    const value = editNombre.trim();
    if (!value || saving) return;

    setSaving(true);
    setError(null);
    setInfoMsg(null);

    try {
      const res = await fetch(`/api/catalog/types/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ nombre: value }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || data?.success === false) {
        const msg = data?.error || data?.message || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      setInfoMsg("Tipo actualizado correctamente.");
      setEditId(null);
      setEditNombre("");
      await loadTipos();
    } catch (e: any) {
      console.error("Error al actualizar tipo", e);
      setError(e?.message || "No se pudo actualizar el tipo");
    } finally {
      setSaving(false);
    }
  }

  /* ========== ELIMINAR ========== */
  async function handleDelete(id: number) {
    const ok = window.confirm(
      "¿Seguro que quieres eliminar este tipo?\nSi está en uso por modelos o activos, la operación puede fallar."
    );
    if (!ok || saving) return;

    setSaving(true);
    setError(null);
    setInfoMsg(null);

    try {
      const res = await fetch(`/api/catalog/types/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || data?.success === false) {
        const msg = data?.error || data?.message || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      setInfoMsg("Tipo eliminado correctamente.");
      await loadTipos();
    } catch (e: any) {
      console.error("Error al eliminar tipo", e);
      setError(
        e?.message ||
        "No se pudo eliminar el tipo (posiblemente está siendo usado)."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredTipos = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tipos;
    return tipos.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      String(t.id).includes(q)
    );
  }, [tipos, search]);

  const canCreate = nombre.trim().length > 0 && !saving;

  /* ========== RENDER ========== */
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Layers className="w-7 h-7 text-indigo-600" />
            Tipos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra los tipos de equipos del inventario.
          </p>
        </div>
        <button
          onClick={loadTipos}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      {/* Error / Success */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {infoMsg && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {infoMsg}
        </div>
      )}

      {/* Formulario de creación */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Agregar nuevo tipo
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              placeholder="Nombre del tipo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {saving ? "Guardando..." : "Agregar"}
          </button>
        </div>
      </section>

      {/* Lista */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Tipos Registrados
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredTipos.length} {filteredTipos.length === 1 ? "tipo" : "tipos"} registrados
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
              <p className="mt-2 text-sm text-slate-500">Cargando tipos...</p>
            </div>
          )}

          {!loading && filteredTipos.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Layers className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-slate-600">Sin tipos</h3>
              <p className="mt-1 text-sm text-slate-500">
                {search.trim() ? "No hay tipos que coincidan con la búsqueda." : "Agrega tu primer tipo arriba."}
              </p>
            </div>
          )}

          {!loading && filteredTipos.map((t) => {
            const isEditing = editId === t.id;
            return (
              <div
                key={t.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-xs text-slate-500 font-mono">#{t.id}</span>
                    {isEditing ? (
                      <input
                        type="text"
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-800">{t.name}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Guardar
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(t)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
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
