//src/app/(app)/catalog/brands/page.tsx
"use client";

import * as React from "react";
import { Catalog } from "@/lib/api";

type Marca = { id: number; name: string };

export default function BrandsPage() {
  const [items, setItems] = React.useState<Marca[]>([]);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function load() {
    const res = await Catalog.listBrands();
    setItems(res.items ?? []);
  }
  React.useEffect(() => { load(); }, []);

  async function onCreate() {
    const n = name.trim();
    if (!n) return;
    setBusy(true);
    try {
      await Catalog.createBrand(n);
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function onRename(id: number, current: string) {
    const next = prompt("Nuevo nombre:", current);
    if (!next) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === current) return;
    await Catalog.updateBrand(id, trimmed);
    await load();
  }

  async function onDelete(id: number) {
    if (!confirm("¿Eliminar marca?")) return;
    await Catalog.deleteBrand(id);
    await load();
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold">Marcas</h1>

      <div className="mb-4 flex gap-3">
        <input
          className="w-full rounded-lg border px-3 py-2"
          placeholder="Nombre de la marca"
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
            {items.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <span>{m.name}</span>
                <div className="flex gap-2">
                  <button className="rounded-md border px-3 py-1" onClick={() => onRename(m.id, m.name)}>
                    Renombrar
                  </button>
                  <button className="rounded-md border px-3 py-1 text-red-600" onClick={() => onDelete(m.id)}>
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
