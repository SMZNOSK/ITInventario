"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/providers";
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

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

  const [newName, setNewName] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const [editing, setEditing] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [rowMsg, setRowMsg] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await fetchJSON<{ items: Platform[] }>(
        "/api/catalog/platforms",
      );
      const arr = Array.isArray((data as any)?.items)
        ? ((data as any).items as Platform[])
        : [];
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
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
        throw new Error(
          data?.message || data?.error || `HTTP ${res.status}`,
        );
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
        throw new Error(
          data?.message || data?.error || `HTTP ${res.status}`,
        );
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
        throw new Error(
          data?.message || data?.error || `HTTP ${res.status}`,
        );
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
        throw new Error(
          data?.message || data?.error || `HTTP ${res.status}`,
        );
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      console.error(e);
      setRowMsg(e?.message || "No se pudo editar la plataforma");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plataformas</h1>
          <p className="text-sm text-slate-500">
            Catálogo de plataformas donde se ejecutan los equipos (Citrix, local,
            escritorio virtual, etc.).
          </p>
        </div>
      </header>

      {/* Crear nueva */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 md:flex-row md:items-center"
        >
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Nombre de la plataforma
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej. APP CITRIX 2013, APP LOCAL, ESCRITORIO VIRTUAL…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={savingNew || !newName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {savingNew ? "Guardando…" : "Agregar"}
          </button>
        </form>
        {rowMsg && (
          <p className="mt-2 text-sm text-slate-700">
            {rowMsg}
          </p>
        )}
      </section>

      {/* Tabla */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && err && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-rose-600">
                  {err}
                </td>
              </tr>
            )}
            {!loading && !err && items.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                  No hay plataformas registradas.
                </td>
              </tr>
            )}
            {!loading &&
              !err &&
              items.map((p) => {
                const isEditing = editing?.id === p.id;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          value={editing?.name ?? ""}
                          onChange={(e) =>
                            setEditing({ id: p.id, name: e.target.value })
                          }
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                        />
                      ) : (
                        <span className="text-slate-800">{p.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {p.isActive ? (
                          <>
                            <ToggleRight className="h-4 w-4 text-emerald-500" />
                            Activa
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 text-slate-400" />
                            Inactiva
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setEditing({ id: p.id, name: p.name })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Edit2 className="h-3 w-3" />
                            Editar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(p)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
