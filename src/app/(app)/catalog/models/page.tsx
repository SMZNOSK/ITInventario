//src/app/(app)/catalog/models/page.tsx
"use client";

import * as React from "react";
import { Catalog, ModelItem, TypeItem, BrandItem } from "@/lib/api";

type ModeloView = ModelItem & {
  typeName?: string | null;
  brandName?: string | null;
};

export default function ModelsPage() {
  const [tipos, setTipos] = React.useState<TypeItem[]>([]);
  const [marcas, setMarcas] = React.useState<BrandItem[]>([]);
  const [items, setItems] = React.useState<ModeloView[]>([]);

  const [nombre, setNombre] = React.useState("");
  const [tipoId, setTipoId] = React.useState<number | "">("");
  const [marcaId, setMarcaId] = React.useState<number | "">("");
  const [busy, setBusy] = React.useState(false);

  async function loadTypes() {
    const t = await Catalog.listTypes();
    setTipos(t.items ?? []);
  }

  async function loadBrands(currentTypeId?: number) {
    const b = await Catalog.listBrands(currentTypeId);
    setMarcas(b.items ?? []);
  }

  async function loadModels(currentTypeId?: number, currentBrandId?: number) {
    const m = await Catalog.listModels({
      typeId: currentTypeId || undefined,
      brandId: currentBrandId || undefined,
    });

    const byType = new Map((tipos ?? []).map((t) => [t.id, t.name]));
    const byBrand = new Map((marcas ?? []).map((b) => [b.id, b.name]));

    const list: ModeloView[] = (m.items ?? []).map((x) => ({
      ...x,
      typeName: byType.get(Number(x.typeId ?? -1)) ?? null,
      brandName: byBrand.get(Number(x.brandId ?? -1)) ?? null,
    }));
    setItems(list);
  }

  React.useEffect(() => {
    (async () => {
      await loadTypes();
      await loadBrands();
      await loadModels();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambie el tipo, recarga marcas filtradas y (opcional) modelos
  React.useEffect(() => {
    (async () => {
      if (tipoId === "") {
        await loadBrands(undefined);
      } else {
        await loadBrands(Number(tipoId));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    if (!n || tipoId === "" || marcaId === "") return;
    setBusy(true);
    try {
      await Catalog.createModel(n, Number(tipoId), Number(marcaId));
      setNombre(""); setTipoId(""); setMarcaId("");
      await loadModels();
    } finally {
      setBusy(false);
    }
  }

  async function toggleEstado(m: ModeloView) {
    const next = (m.status ?? "ALTA") === "ALTA" ? "BAJA" : "ALTA";
    await Catalog.updateModel(m.id, { status: next as "ALTA" | "BAJA" });
    await loadModels();
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold">Modelos</h1>

      <form onSubmit={onCreate} className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          className="rounded-lg border px-3 py-2"
          placeholder="Nombre del modelo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <select
          className="rounded-lg border px-3 py-2"
          value={tipoId}
          onChange={(e) => setTipoId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Tipo...</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select
          className="rounded-lg border px-3 py-2"
          value={marcaId}
          onChange={(e) => setMarcaId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Marca...</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <button className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50" disabled={busy}>
          {busy ? "Guardando..." : "Agregar"}
        </button>
      </form>

      <div className="rounded-xl border bg-white">
        {items.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Sin registros</div>
        ) : (
          <ul className="divide-y">
            {items.map((m) => {
              const active = (m.status ?? "ALTA") !== "BAJA";
              return (
                <li key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium">{m.name ?? `#${m.id}`}</div>
                    <div className="text-sm text-gray-600">
                      {(m.typeName ?? "—")} • {(m.brandName ?? "—")}
                    </div>
                  </div>
                  <button className="rounded-md border px-3 py-1" onClick={() => toggleEstado(m)}>
                    {active ? "Desactivar" : "Activar"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
