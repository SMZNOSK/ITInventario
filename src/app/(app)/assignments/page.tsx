"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/providers";

type AssignmentItem = {
  id: string;
  assetSerial: string;
  collaboratorId: string;
  collaboratorName: string;
  status: "ASIGNADO" | "DEVUELTO";
  assignedAt: string;
  returnedAt?: string;
};

type ListResponse<T> = { items: T[] };

export default function AssignmentsPage() {
  const { fetchJSON } = useAuth();

  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchJSON<ListResponse<AssignmentItem>>("/api/assignments");
      setItems(res.items ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Error cargando asignaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } finally {
        if (!cancelled) void 0;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-5xl mx-auto mt-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Asignaciones</h1>
        <button
          onClick={load}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Refrescar
        </button>
      </div>

      {loading && <p className="text-center text-gray-500">Cargando...</p>}

      {error && (
        <p className="text-center text-red-600 mb-4">
          Error: {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-center text-gray-500">
          No hay asignaciones registradas.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-4 border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-white text-left">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Serial</th>
                <th className="px-4 py-2">Colaborador</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Asignado</th>
                <th className="px-4 py-2">Devuelto</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="px-4 py-2">{a.id}</td>
                  <td className="px-4 py-2">{a.assetSerial}</td>
                  <td className="px-4 py-2">
                    {a.collaboratorName} ({a.collaboratorId})
                  </td>
                  <td className="px-4 py-2">{a.status}</td>
                  <td className="px-4 py-2">
                    {new Date(a.assignedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    {a.returnedAt ? new Date(a.returnedAt).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
