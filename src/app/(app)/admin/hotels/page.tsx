//src/app/(app)/admin/hotels/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";
import { Building2, RefreshCw, Plus, Edit, Power, Trash2, Search } from "lucide-react";

type Hotel = {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormMode = "create" | "edit";

export default function AdminHotelsPage() {
  const { fetchJSON } = useAuth();

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  async function loadHotels() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJSON<{ items: Hotel[] }>("/api/admin/hotels");
      setHotels(data.items ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al cargar hoteles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHotels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setFormMode("create");
    setEditingId(null);
    setName("");
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre del hotel es obligatorio.");
      return;
    }

    try {
      setBusy(true);
      if (formMode === "create") {
        const res = await fetch("/api/admin/hotels", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });

        if (res.status === 409) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Ya existe un hotel con ese nombre");
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Error al crear hotel");
        }
      } else if (formMode === "edit" && editingId != null) {
        const res = await fetch(`/api/admin/hotels/${editingId}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });

        if (res.status === 409) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Ya existe un hotel con ese nombre");
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || "Error al actualizar hotel");
        }
      }

      await loadHotels();
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al guardar el hotel");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(hotel: Hotel) {
    setFormMode("edit");
    setEditingId(hotel.id);
    setName(hotel.name);
  }

  async function toggleActive(hotel: Hotel) {
    try {
      setError(null);
      const path = hotel.active ? "deactivate" : "activate";
      const res = await fetch(`/api/admin/hotels/${hotel.id}/${path}`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Error al cambiar estado del hotel");
      }
      await loadHotels();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al cambiar estado del hotel");
    }
  }

  async function handleDelete(hotel: Hotel) {
    if (!window.confirm(`¿Seguro que quieres borrar el hotel "${hotel.name}"?`)) return;

    try {
      setError(null);
      const res = await fetch(`/api/admin/hotels/${hotel.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Error al eliminar hotel");
      }
      await loadHotels();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al eliminar hotel");
    }
  }

  const filteredHotels = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hotels;
    return hotels.filter((h) => h.name.toLowerCase().includes(q));
  }, [hotels, search]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-indigo-600" />
            Hoteles
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra los hoteles y sedes del sistema.
          </p>
        </div>
        <button
          onClick={loadHotels}
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
          {formMode === "create" ? "Agregar nuevo hotel" : "Editar hotel"}
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
              placeholder="Nombre del hotel"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <button
            onClick={() => handleSubmit()}
            disabled={busy || !name.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {busy ? "Guardando..." : formMode === "create" ? "Agregar" : "Guardar"}
          </button>
          {formMode === "edit" && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center px-3 py-2.5 text-sm border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </section>

      {/* Lista */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Lista de Hoteles
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredHotels.length} {filteredHotels.length === 1 ? "hotel" : "hoteles"} registrados
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
              <p className="mt-2 text-sm text-slate-500">Cargando hoteles...</p>
            </div>
          )}

          {!loading && filteredHotels.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-slate-600">Sin hoteles</h3>
              <p className="mt-1 text-sm text-slate-500">
                {search.trim() ? "No hay hoteles que coincidan con la búsqueda." : "Agrega tu primer hotel arriba."}
              </p>
            </div>
          )}

          {!loading && filteredHotels.map((h) => (
            <div key={h.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-800">{h.name}</span>
                  <div className="mt-0.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${h.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                        }`}
                    >
                      {h.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(h)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => toggleActive(h)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                >
                  <Power className="w-3.5 h-3.5" />
                  {h.active ? "Desactivar" : "Activar"}
                </button>
                <button
                  onClick={() => handleDelete(h)}
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
