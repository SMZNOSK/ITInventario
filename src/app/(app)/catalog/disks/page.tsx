// src/app/(app)/catalog/disks/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/providers";

type DiskApi = {
  id: number;
  name: string;
  vendor?: string | null;
  isActive?: boolean | null;
};

type DiskRow = {
  id: number;
  name: string;
  vendor: string;
  active: boolean;
};

const statusStyles = {
  true: "bg-emerald-100 text-emerald-800 border-emerald-200",
  false: "bg-rose-100 text-rose-800 border-rose-200",
} as const;

export default function DisksPage() {
  const { fetchJSON } = useAuth();

  const [rows, setRows] = useState<DiskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setErr(null);

      const data = await fetchJSON<{ items: DiskApi[] }>(
        "/api/catalog/disks",
      );
      const items = Array.isArray(data?.items) ? data.items : [];

      setRows(
        items.map((d) => ({
          id: d.id,
          name: d.name || "",
          vendor: d.vendor || "",
          active: d.isActive ?? true,
        })),
      );
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Error al cargar tipos de disco");
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
    const cleanName = name.trim();
    const cleanVendor = vendor.trim();
    if (!cleanName) return;

    try {
      setBusy(true);
      setErr(null);

      const body: any = {
        name: cleanName,
        nombre: cleanName,
        nombre_disco: cleanName,
      };
      if (cleanVendor) body.vendor = cleanVendor;

      const res = await fetch("/api/catalog/disks", {
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
      setErr(e?.message || "No se pudo crear el tipo de disco");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: DiskRow) {
    try {
      setErr(null);

      const res = await fetch("/api/catalog/disks", {
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

  async function handleDelete(row: DiskRow) {
    const confirm = window.confirm(
      `¿Eliminar definitivamente el tipo de disco "${row.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirm) return;

    try {
      setErr(null);

      const res = await fetch("/api/catalog/disks", {
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
      setErr(e?.message || "No se pudo eliminar el tipo de disco");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h2 className="text-2xl font-bold tracking-tight">Tipos de disco</h2>
      <p className="text-sm text-slate-600">
        Registra los tipos/capacidades de disco que se podrán asignar a CPUs y
        laptops en el inventario.
      </p>

      {/* Formulario */}
      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-3 rounded-xl border bg-white/70 p-4 shadow-sm dark:bg-white/5"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Nombre del tipo de disco
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="1 TB SSD, 2 TB HDD 7200 RPM…"
              className="w-full rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Proveedor / fabricante (opcional)
            </label>
            <input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Samsung, Seagate, Western Digital…"
              className="w-full rounded-lg border border-slate-300 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Estos valores se usarán más adelante al capturar inventario de CPUs y
          laptops.
        </p>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </form>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border bg-white/70 shadow-sm dark:bg-white/5">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-900 text-left text-xs font-semibold uppercase tracking-wide text-slate-50">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Estatus</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Cargando…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-slate-500"
                >
                  Aún no hay tipos de disco registrados.
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-200 last:border-b dark:border-slate-700"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-slate-900 dark:text-slate-900">
                    {row.name || (
                      <span className="text-slate-400">Sin nombre</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      {row.vendor || "—"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(row)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[row.active ? "true" : "false"]}`}
                    >
                      {row.active ? "ACTIVO" : "INACTIVO"}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(row)}
                      className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
