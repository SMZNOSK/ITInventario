//src/app/(app)/disposals/page.tsx:

"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/providers";

/* ------ tipos y helpers ------ */
type DisposalApi =
  | {
      id: string;
      assetId?: number;
      assetSerial?: string;
      serial?: string;
      reason: string;
      evidence?: string | null;
      evidenceUrl?: string | null;
      disposedAt: string | Date;
    }
  | any;

type ListResponse<T> = { items: T[] };

type Row = {
  id: string;
  serial: string;
  reason: string;
  evidence?: string | null;
  disposedAt: string;
};

function normalize(x: DisposalApi): Row {
  const serial = x.assetSerial ?? x.serial ?? "-";
  const evidence = (x.evidenceUrl ?? x.evidence) ?? null;
  const disposedAt =
    typeof x.disposedAt === "string"
      ? x.disposedAt
      : x.disposedAt instanceof Date
      ? x.disposedAt.toISOString()
      : new Date().toISOString();

  return {
    id: String(x.id),
    serial,
    reason: String(x.reason ?? ""),
    evidence,
    disposedAt,
  };
}

function EvidenceCell({ value }: { value?: string | null }) {
  if (!value) return <span>-</span>;
  const isLink = /^https?:\/\//i.test(value) || value.startsWith("/");
  return isLink ? (
    <a href={value} target="_blank" rel="noreferrer" className="underline">
      {value}
    </a>
  ) : (
    <span>{value}</span>
  );
}

/* ------ página ------ */
export default function DisposalsPage() {
  const { fetchJSON } = useAuth();

  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchJSON<ListResponse<DisposalApi>>("/api/disposals");
      const rows = (res.items ?? []).map(normalize);
      setItems(rows);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando bajas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Bajas</h1>
        <button
          onClick={load}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          Refrescar
        </button>
      </div>

      {loading && <p className="text-center text-gray-500">Cargando...</p>}

      {error && (
        <p className="mb-4 text-center text-red-600">Error: {error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-center text-gray-500">
          No hay bajas registradas.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 text-left text-white">
                <th className="px-4 py-2">ID</th>
                <th className="px-4 py-2">Serial</th>
                <th className="px-4 py-2">Motivo</th>
                <th className="px-4 py-2">Evidencia</th>
                <th className="px-4 py-2">Fecha baja</th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="px-4 py-2">{d.id}</td>
                  <td className="px-4 py-2">{d.serial}</td>
                  <td className="px-4 py-2">{d.reason}</td>
                  <td className="px-4 py-2">
                    <EvidenceCell value={d.evidence} />
                  </td>
                  <td className="px-4 py-2">
                    {new Date(d.disposedAt).toLocaleString()}
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
