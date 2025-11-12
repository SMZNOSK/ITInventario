"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/providers";

type AssetApi = {
  id: number;
  serial: string;
  status: string;
  typeId?: number | null;
  brandId?: number | null;
  modelId?: number | null;
  currentHotelId?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

type AssetRow = {
  id: number;
  serial: string;
  status: string;
  typeId?: number | null;
  brandId?: number | null;
  modelId?: number | null;
  currentHotelId?: number | null;
};

export default function AssetsPage() {
  const { fetchJSON } = useAuth();

  const [rows, setRows] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");

  const [importCode, setImportCode] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (status) p.set("status", status);
    return p.toString();
  }, [q, status]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await fetchJSON<{ items: AssetApi[] }>(
        `/api/assets${qs ? `?${qs}` : ""}`
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      setRows(
        items.map((a) => ({
          id: a.id,
          serial: a.serial,
          status: a.status ?? "-",
          typeId: a.typeId ?? null,
          brandId: a.brandId ?? null,
          modelId: a.modelId ?? null,
          currentHotelId: a.currentHotelId ?? null,
        }))
      );
    } catch (e: any) {
      setErr(e?.message || "Error al cargar activos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    const code = importCode.trim();
    if (!code) return;

    try {
      setImportLoading(true);
      setImportMsg(null);

      // POST de importación
      const res = await fetch(`/api/assets/import/by-code/${encodeURIComponent(code)}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.reason || data?.error || `HTTP ${res.status}`);
      }

      setImportMsg(`✅ Importado: ${code}`);
      setImportCode("");
      await load();
    } catch (e: any) {
      setImportMsg(`❌ Error: ${e?.message || "No se pudo importar"}`);
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Activos</h2>

      {/* Import + filtros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <form
          onSubmit={handleImport}
          className="col-span-1 bg-white/70 dark:bg-white/5 border rounded-xl p-4 shadow-sm flex flex-col gap-3"
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Importar por código
            </label>
            <input
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
              placeholder="ABC123"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900"
            />
          </div>
          <button
            type="submit"
            disabled={importLoading || !importCode.trim()}
            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white disabled:opacity-50"
          >
            {importLoading ? "Importando…" : "Importar"}
          </button>
          {importMsg && <span className="text-sm">{importMsg}</span>}
        </form>

        <div className="col-span-1 bg-white/70 dark:bg-white/5 border rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Buscar
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Serial…"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Estatus
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900"
            >
              <option value="">Todos</option>
              <option value="ALTA">ALTA</option>
              <option value="ASIGNADO">ASIGNADO</option>
              <option value="TRANSFERENCIA_PENDIENTE">TRANSFERENCIA_PENDIENTE</option>
              <option value="BAJA">BAJA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white/70 dark:bg-white/5 border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-3 font-semibold">Serial</th>
                <th className="px-4 py-3 font-semibold">Estatus</th>
                <th className="px-4 py-3 font-semibold">Tipo (ID)</th>
                <th className="px-4 py-3 font-semibold">Marca (ID)</th>
                <th className="px-4 py-3 font-semibold">Modelo (ID)</th>
                <th className="px-4 py-3 font-semibold">Hotel (ID)</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center">
                    Cargando…
                  </td>
                </tr>
              )}
              {err && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                    {err}
                  </td>
                </tr>
              )}
              {!loading &&
                !err &&
                rows.map((a) => (
                  <tr key={a.id} className="border-t border-slate-200 dark:border-slate-700">
                    <td className="px-4 py-3 font-mono">{a.serial}</td>
                    <td className="px-4 py-3">{a.status}</td>
                    <td className="px-4 py-3">{a.typeId ?? "-"}</td>
                    <td className="px-4 py-3">{a.brandId ?? "-"}</td>
                    <td className="px-4 py-3">{a.modelId ?? "-"}</td>
                    <td className="px-4 py-3">{a.currentHotelId ?? "-"}</td>
                  </tr>
                ))}
              {!loading && !err && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Sin resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
