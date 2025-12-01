//src/app/(app)/disposals/page.tsx:
"use client";

import * as React from "react";

type DisposalItem = {
  id: string;
  assetSerial: string;
  reason: string;
  notes?: string;
  evidenceUrl?: string;
  disposedAt: string;
};

type FormState = {
  assetId: string;
  reason: string;
  notes: string;
};

export default function DisposalsPage() {
  const [items, setItems] = React.useState<DisposalItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<FormState>({
    assetId: "",
    reason: "",
    notes: "",
  });

  const loadDisposals = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/disposals", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Error al cargar bajas (${res.status})`);
      }
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al cargar bajas");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDisposals();
  }, [loadDisposals]);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.assetId.trim() || !form.reason.trim()) {
      setError("Equipo (ID o serial) y motivo son obligatorios");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        assetId: form.assetId.trim(),
        reason: form.reason.trim(),
        notes: form.notes.trim() || undefined,
      };

      const res = await fetch("/api/disposals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg =
          (data && (data.message || data.error)) ||
          `Error al crear baja (${res.status})`;
        throw new Error(msg);
      }

      await loadDisposals();
      setForm({ assetId: "", reason: "", notes: "" });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error al crear baja");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Bajas de equipo
        </h1>
        <p className="text-sm text-zinc-500">
          Registra equipos dados de baja y consulta su historial.
        </p>
      </header>

      {/* Formulario */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          Nueva baja
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
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              value={form.assetId}
              onChange={(e) => handleChange("assetId", e.target.value)}
              placeholder="Ej. 1 o TEST-001"
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-zinc-600">
              Motivo
            </label>
            <input
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              value={form.reason}
              onChange={(e) => handleChange("reason", e.target.value)}
              placeholder="Ej. Equipo obsoleto, dañado, extraviado..."
            />
          </div>

          <div className="flex flex-col gap-1 md:col-span-3">
            <label className="text-xs font-medium text-zinc-600">
              Notas (opcional)
            </label>
            <textarea
              className="min-h-[60px] rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Detalles adicionales de la baja..."
            />
          </div>

          <div className="mt-2 flex items-end md:col-span-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Guardando..." : "Registrar baja"}
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
            Historial de bajas
          </h2>
          <button
            type="button"
            onClick={loadDisposals}
            className="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Refrescar"}
          </button>
        </div>

        {loading && (
          <p className="text-sm text-zinc-500">Cargando bajas...</p>
        )}

        {!loading && items.length === 0 && (
          <p className="text-sm text-zinc-500">
            No hay bajas registradas todavía.
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
                    Motivo
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">
                    Notas
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-600">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-zinc-100 last:border-none"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-zinc-800">
                      {d.assetSerial}
                    </td>
                    <td className="px-3 py-2 text-zinc-800">
                      {d.reason}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-700">
                      {d.notes || "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-700">
                      {new Date(d.disposedAt).toLocaleString()}
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
