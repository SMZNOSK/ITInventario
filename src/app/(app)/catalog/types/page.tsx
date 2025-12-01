// src/app/(app)/catalog/types/page.tsx
"use client";

import * as React from "react";

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
        // ordena por id para que coincida con lo que ves en Prisma
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
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
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

  const canCreate = nombre.trim().length > 0 && !saving;

  /* ========== RENDER ========== */
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-center text-2xl font-bold">Tipos</h1>

      <form
        onSubmit={handleCreate}
        className="mb-4 flex gap-3"
      >
        <input
          className="flex-1 rounded-lg border px-3 py-2"
          placeholder="Nombre del tipo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <button
          type="submit"
          disabled={!canCreate}
          className="rounded-lg px-4 py-2 text-white disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 hover:bg-slate-800"
        >
          {saving ? "Guardando..." : "Agregar"}
        </button>
      </form>

      {error && (
        <p className="mb-2 text-sm text-red-600">{error}</p>
      )}
      {infoMsg && (
        <p className="mb-2 text-sm text-emerald-700">{infoMsg}</p>
      )}

      <div className="rounded-xl border bg-white">
        <div className="border-b px-4 py-2 text-xs font-semibold tracking-wide text-slate-500">
          TIPOS REGISTRADOS
        </div>

        {loading ? (
          <div className="p-4 text-center text-sm text-slate-500">
            Cargando…
          </div>
        ) : tipos.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            Sin registros
          </div>
        ) : (
          <ul className="divide-y">
            {tipos.map((t) => {
              const isEditing = editId === t.id;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      #{t.id}
                    </span>

                    {isEditing ? (
                      <input
                        className="rounded-lg border px-3 py-1 text-sm"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                      />
                    ) : (
                      <span className="font-semibold text-slate-900">
                        {t.name}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-50"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-md border px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(t)}
                          className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
