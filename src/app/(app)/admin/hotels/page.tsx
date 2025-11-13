//src/app/(app)/admin/hotels/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/providers";

type Hotel = {
  id: number;
  name: string;
  active: boolean;          // ← en tu API final es "active" (no "isActive")
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("El nombre del hotel es obligatorio.");
      return;
    }

    try {
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Administración de hoteles</h1>

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tabla de hoteles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">Listado de hoteles</h2>
            {loading && <span className="text-xs text-gray-500">Cargando...</span>}
          </div>

          <div className="border rounded-md overflow-hidden text-sm">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left border-b">ID</th>
                  <th className="px-3 py-2 text-left border-b">Nombre</th>
                  <th className="px-3 py-2 text-left border-b">Estado</th>
                  <th className="px-3 py-2 text-left border-b">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {hotels.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                      No hay hoteles registrados.
                    </td>
                  </tr>
                )}

                {hotels.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border-b">{h.id}</td>
                    <td className="px-3 py-2 border-b">{h.name}</td>
                    <td className="px-3 py-2 border-b">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          h.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {h.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-b space-x-2">
                      <button
                        className="text-xs text-blue-600 hover:underline"
                        onClick={() => startEdit(h)}
                      >
                        Editar
                      </button>
                      <button
                        className="text-xs text-yellow-700 hover:underline"
                        onClick={() => toggleActive(h)}
                      >
                        {h.active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        className="text-xs text-red-600 hover:underline"
                        onClick={() => handleDelete(h)}
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formulario crear/editar */}
        <div>
          <h2 className="font-medium mb-2">
            {formMode === "create" ? "Crear hotel" : "Editar hotel"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nombre del hotel</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Moon Palace Nizuc"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                {formMode === "create" ? "Crear" : "Guardar cambios"}
              </button>

              {formMode === "edit" && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center px-3 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
