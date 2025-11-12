//src/app/(app)/catalog/providers/page.tsx
"use client";

import * as React from "react";
import { Catalog } from "@/lib/api";

type Provider = { id: number; name: string; active?: boolean | null };

export default function ProvidersPage() {
  const [items, setItems] = React.useState<Provider[]>([]);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function load() {
    const res = await Catalog.listProviders();
    setItems(res.items || []);
  }
  React.useEffect(() => { load(); }, []);

  async function onCreate() {
    const n = name.trim(); if (!n) return;
    setBusy(true);
    try {
      await Catalog.createProvider(n);
      setName(""); await load();
    } finally {
      setBusy(false);
    }
  }

  async function onRename(id: number, current: string) {
    const next = prompt("Nuevo nombre:", current);
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === current) return;
    await Catalog.updateProvider(id, trimmed);
    await load();
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar proveedor?")) return;
    await Catalog.deleteProvider(id);
    await load();
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold">Proveedores</h1>

      <div className="mb-4 flex gap-3">
        <input
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Nombre del proveedor"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCreate()}
        />
        <button
          onClick={onCreate}
          disabled={busy}
          className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Agregar
        </button>
      </div>

      <div className="rounded-xl border bg-white">
        {items.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Sin registros</div>
        ) : (
          <ul className="divide-y">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-4 py-3">
                <span>{p.name}</span>
                <div className="flex gap-2">
                  <button className="rounded-md border px-3 py-1" onClick={() => onRename(p.id, p.name)}>
                    Renombrar
                  </button>
                  <button className="rounded-md border px-3 py-1 text-red-600" onClick={() => onDelete(p.id)}>
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
