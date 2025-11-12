"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/providers";

/* --------- tipos --------- */
type Collaborator = {
  id: string | number;
  name: string;
  employeeId?: string | number;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
};

type ApiList<T> = { items: T[]; page?: number; pageSize?: number; total?: number };

/* --------- página --------- */
export default function CollaboratorsPage() {
  const { fetchJSON } = useAuth();

  // filtros/ui
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // datos
  const [rows, setRows] = useState<Collaborator[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const debouncedQ = useDebounce(q, 300);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQ.trim()) p.set("q", debouncedQ.trim());
    p.set("page", String(page));
    p.set("pageSize", String(pageSize));
    return p.toString();
  }, [debouncedQ, page, pageSize]);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const data = await fetchJSON<ApiList<Collaborator> | Collaborator[]>(
        `/api/collaborators?${queryString}`
      );

      const items: Collaborator[] = Array.isArray(data) ? data : (data.items ?? []);
      setRows(items);
      setTotal(Array.isArray(data) ? undefined : data.total);
    } catch (e: any) {
      setErr(e?.message || "Error al cargar colaboradores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!aborted) await load();
    })();
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const canPrev = page > 1;
  const canNext = useMemo(() => {
    if (typeof total === "number") {
      const maxPage = Math.max(1, Math.ceil(total / pageSize));
      return page < maxPage;
    }
    // Si el backend no manda total, inferimos con el tamaño de página
    return rows.length === pageSize;
  }, [total, rows.length, page, pageSize]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Colaboradores</h2>
        <button
          onClick={load}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Refrescar
        </button>
      </div>

      {/* Filtros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="col-span-1 bg-white/70 dark:bg-white/5 border rounded-xl p-4 shadow-sm flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Buscar (nombre, employeeId, correo…)
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ej. Juan Pérez o 123456"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-600 dark:text-slate-300">
              Por página
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded-lg px-2 py-1 text-sm bg-white dark:bg-slate-900"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Resumen / estado */}
        <div className="col-span-1 bg-white/70 dark:bg-white/5 border rounded-xl p-4 shadow-sm flex flex-col justify-center">
          <p className="text-sm">
            {loading ? "Cargando…" : err ? <span className="text-red-600">{err}</span> : "Listo"}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {typeof total === "number"
              ? `Total: ${total}`
              : `Resultados: ${rows.length}${rows.length === pageSize ? "+" : ""}`}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white/70 dark:bg-white/5 border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-left">
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Employee ID</th>
                <th className="px-4 py-3 font-semibold">Departamento</th>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Teléfono</th>
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
              {!loading && err && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                    {err}
                  </td>
                </tr>
              )}
              {!loading && !err && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Sin resultados
                  </td>
                </tr>
              )}
              {!loading &&
                !err &&
                rows.map((c) => (
                  <tr
                    key={String(c.id)}
                    className="border-t border-slate-200 dark:border-slate-700"
                  >
                    <td className="px-4 py-3">{c.id}</td>
                    <td className="px-4 py-3">{c.name}</td>
                    <td className="px-4 py-3">{c.employeeId ?? "-"}</td>
                    <td className="px-4 py-3">{c.department ?? "-"}</td>
                    <td className="px-4 py-3">{c.email ?? "-"}</td>
                    <td className="px-4 py-3">{c.phone ?? "-"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-white/60 dark:bg-slate-900/40">
          <button
            className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
          >
            ← Anterior
          </button>
          <div className="text-sm">
            Página <span className="font-semibold">{page}</span>
            {typeof total === "number" ? (
              <>
                {" "}
                de{" "}
                <span className="font-semibold">
                  {Math.max(1, Math.ceil(total / pageSize))}
                </span>
              </>
            ) : null}
          </div>
          <button
            className="px-3 py-2 text-sm rounded-lg border bg-white hover:bg-slate-50 disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={!canNext}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------- helpers --------- */
function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setV(value), ms);
    return () => {
      if (tRef.current) window.clearTimeout(tRef.current);
    };
  }, [value, ms]);

  return v;
}
