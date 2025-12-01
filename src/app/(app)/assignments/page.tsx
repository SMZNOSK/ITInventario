// src/app/(app)/assignments/page.tsx
"use client";

import * as React from "react";

type AssignmentItem = {
  id: string;
  assetSerial: string;
  collaboratorId: string;
  collaboratorName: string;
  status: "ASIGNADO" | "DEVUELTO";
  assignedAt: string;
  returnedAt?: string;
};

type FormState = {
  assetId: string;
  collaboratorId: string;
  collaboratorName: string;
};

export default function AssignmentsPage() {
  const [items, setItems] = React.useState<AssignmentItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>({
    assetId: "",
    collaboratorId: "",
    collaboratorName: "",
  });

  /* ========= Cargar listado ========= */

  const loadAssignments = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/assignments", {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`Error al cargar asignaciones (${res.status})`);
      }

      const data = await res.json();
      // El endpoint devuelve { items }
      setItems(data.items ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al cargar asignaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  /* ========= Handlers de formulario ========= */

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.assetId.trim() || !form.collaboratorId.trim()) {
      setError("Equipo (ID o serial) y Emplid del colaborador son obligatorios");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        assetId: form.assetId.trim(),
        collaboratorId: form.collaboratorId.trim(),
        collaboratorName: form.collaboratorName.trim() || undefined,
        // startAt / assignedBy se pueden agregar después si hace falta.
      };

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          (data && (data.message || data.error)) ||
          `Error al crear asignación (${res.status})`;
        throw new Error(msg);
      }

      await loadAssignments();
      setForm({ assetId: "", collaboratorId: "", collaboratorName: "" });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al crear asignación");
    } finally {
      setSubmitting(false);
    }
  }

  /* ========= Marcar como devuelto ========= */

  async function handleEnd(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${id}/end`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          `Error al marcar como devuelto (${res.status})`;
        throw new Error(msg);
      }

      await loadAssignments();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al marcar como devuelto");
    }
  }

  /* ========= UI ========= */

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Asignaciones de equipo
        </h1>
        <p className="text-sm text-zinc-500">
          Registra y consulta qué equipo está asignado a cada colaborador.
        </p>
      </header>

      {/* Formulario de alta */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          Nueva asignación
        </h2>
        <form
          onSubmit={handleSubmit}
          className="grid gap-3 md:grid-cols-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Equipo (ID o serial)
            </label>
            <input
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Ej. 1 o TEST-001"
              value={form.assetId}
              onChange={(e) => handleChange("assetId", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              EMPLID del colaborador
            </label>
            <input
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Ej. 00012345"
              value={form.collaboratorId}
              onChange={(e) => handleChange("collaboratorId", e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-600">
              Nombre del colaborador (opcional)
            </label>
            <input
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Nombre Apellido"
              value={form.collaboratorName}
              onChange={(e) => handleChange("collaboratorName", e.target.value)}
            />
          </div>

          <div className="mt-2 flex items-end md:col-span-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Guardando..." : "Crear asignación"}
            </button>
          </div>
        </form>

        {error && (
          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </section>

      {/* Listado */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-zinc-700">
            Asignaciones recientes
          </h2>
          <button
            type="button"
            onClick={loadAssignments}
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Refrescar"}
          </button>
        </div>

        {loading && (
          <p className="text-sm text-zinc-500">Cargando asignaciones...</p>
        )}

        {!loading && items.length === 0 && (
          <p className="text-sm text-zinc-500">
            No hay asignaciones registradas todavía.
          </p>
        )}

        {!loading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">
                    Equipo (serial)
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">
                    Colaborador
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">
                    EMPLID
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">
                    Estado
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">
                    Asignado
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">
                    Devuelto
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-zinc-100 last:border-none"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-zinc-800">
                      {a.assetSerial || "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-800">
                      {a.collaboratorName || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-700">
                      {a.collaboratorId}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium " +
                          (a.status === "ASIGNADO"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-zinc-50 text-zinc-600 border border-zinc-200")
                        }
                      >
                        {a.status === "ASIGNADO" ? "Asignado" : "Devuelto"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-700">
                      {new Date(a.assignedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-700">
                      {a.returnedAt
                        ? new Date(a.returnedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {a.status === "ASIGNADO" ? (
                        <button
                          type="button"
                          onClick={() => handleEnd(a.id)}
                          className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Marcar devuelto
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
