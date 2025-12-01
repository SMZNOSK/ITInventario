// src/app/(app)/catalog/models/page.tsx
"use client";

import * as React from "react";
import { Catalog, ModelItem, TypeItem, BrandItem } from "@/lib/api";

type ModeloView = ModelItem & {
  typeName?: string | null;
  brandName?: string | null;
};

/* ===== Helpers de fetch directos a las APIs de catálogo ===== */

async function fetchTypes(): Promise<TypeItem[]> {
  const res = await fetch("/api/catalog/types/activos", {
    headers: { Accept: "application/json" },
  });
  const data = (await res.json().catch(() => null)) as any;
  const tipos =
    (data?.tipos as TypeItem[] | undefined) ??
    (data?.items as TypeItem[] | undefined) ??
    [];
  return Array.isArray(tipos) ? tipos : [];
}

async function fetchBrands(): Promise<BrandItem[]> {
  const res = await fetch("/api/catalog/brands", {
    headers: { Accept: "application/json" },
  });
  const data = (await res.json().catch(() => null)) as any;
  const brands =
    (data?.items as BrandItem[] | undefined) ??
    (data?.brands as BrandItem[] | undefined) ??
    (data?.marcas as BrandItem[] | undefined) ??
    [];
  return Array.isArray(brands) ? brands : [];
}

async function fetchModels(): Promise<ModelItem[]> {
  const res = await fetch("/api/catalog/models", {
    headers: { Accept: "application/json" },
  });
  const data = (await res.json().catch(() => null)) as any;
  const models =
    (data?.items as ModelItem[] | undefined) ??
    (data?.models as ModelItem[] | undefined) ??
    (data?.data as ModelItem[] | undefined) ??
    [];
  return Array.isArray(models) ? models : [];
}

/** Une modelos con nombres de tipo y marca */
function mapModels(
  models: ModelItem[],
  tipos: TypeItem[],
  marcas: BrandItem[]
): ModeloView[] {
  const byType = new Map(tipos.map((t) => [t.id, t.name]));
  const byBrand = new Map(marcas.map((b) => [b.id, b.name]));

  return models.map((x) => ({
    ...x,
    typeName: byType.get(Number((x as any).typeId ?? -1)) ?? null,
    brandName: byBrand.get(Number((x as any).brandId ?? -1)) ?? null,
  }));
}

export default function ModelsPage() {
  const [tipos, setTipos] = React.useState<TypeItem[]>([]);
  const [marcas, setMarcas] = React.useState<BrandItem[]>([]);
  const [items, setItems] = React.useState<ModeloView[]>([]);

  const [nombre, setNombre] = React.useState("");
  const [tipoId, setTipoId] = React.useState<number | "">("");
  const [marcaId, setMarcaId] = React.useState<number | "">("");

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* ========== CARGA INICIAL ========== */
  React.useEffect(() => {
    (async () => {
      try {
        setError(null);
        const [t, b, m] = await Promise.all([
          fetchTypes(),
          fetchBrands(),
          fetchModels(),
        ]);
        setTipos(t);
        setMarcas(b);
        setItems(mapModels(m, t, b));
      } catch (e: any) {
        console.error("Error al cargar modelos", e);
        setError(e?.message || "Error al cargar modelos");
        setItems([]);
      }
    })();
  }, []);

  /* ========== RELOAD MODELS ========== */
  async function reloadModels() {
    try {
      const m = await fetchModels();
      setItems(mapModels(m, tipos, marcas));
    } catch (e: any) {
      console.error("Error al recargar modelos", e);
      setError(e?.message || "Error al recargar modelos");
    }
  }

  /* ========== CREAR MODELO ========== */
  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    if (!n || tipoId === "" || marcaId === "") return;

    setBusy(true);
    try {
      setError(null);
      await Catalog.createModel(n, Number(tipoId), Number(marcaId));
      setNombre("");
      setTipoId("");
      setMarcaId("");
      await reloadModels();
    } catch (e: any) {
      console.error("Error al crear modelo", e);
      setError(e?.message || "No se pudo crear el modelo");
    } finally {
      setBusy(false);
    }
  }

  /* ========== ACTIVAR / DESACTIVAR ========== */
  async function toggleEstado(m: ModeloView) {
    const current = (m.status ?? "ALTA").toUpperCase();
    const next: "ALTA" | "BAJA" = current === "BAJA" ? "ALTA" : "BAJA";

    try {
      setError(null);
      await Catalog.updateModelStatus(m.id, next);
      await reloadModels();
    } catch (e: any) {
      console.error("Error al actualizar estado del modelo", e);
      setError(e?.message || "Error al actualizar estado del modelo");
    }
  }

  /* ========== ELIMINAR MODELO ========== */
  async function handleDeleteModel(m: ModeloView) {
    const ok = window.confirm(
      `¿Seguro que quieres eliminar el modelo "${m.name ?? `#${m.id}`}"?\n\n` +
        "Si el modelo está asociado a equipos, la base de datos no permitirá borrarlo."
    );
    if (!ok) return;

    try {
      setError(null);

      const res = await fetch(`/api/catalog/models/${m.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        const msg =
          data?.error || data?.message || `Error HTTP ${res.status}`;
        throw new Error(msg);
      }

      await reloadModels();
    } catch (e: any) {
      console.error("Error al eliminar modelo", e);
      setError(e?.message || "Error al eliminar el modelo");
    }
  }

  const canCreate =
    nombre.trim().length > 0 && tipoId !== "" && marcaId !== "" && !busy;

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-bold">Modelos</h1>

      <form
        onSubmit={onCreate}
        className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4"
      >
        <input
          className="rounded-lg border px-3 py-2"
          placeholder="Nombre del modelo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
        <select
          className="rounded-lg border px-3 py-2"
          value={tipoId}
          onChange={(e) =>
            setTipoId(e.target.value ? Number(e.target.value) : "")
          }
        >
          <option value="">Tipo...</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border px-3 py-2"
          value={marcaId}
          onChange={(e) =>
            setMarcaId(e.target.value ? Number(e.target.value) : "")
          }
        >
          <option value="">Marca...</option>
          {marcas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <button
          className="rounded-lg px-4 py-2 text-white disabled:opacity-40 disabled:cursor-not-allowed bg-black hover:bg-slate-800"
          disabled={!canCreate}
        >
          {busy ? "Guardando..." : "Agregar"}
        </button>
      </form>

      {error && (
        <p className="mb-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="rounded-xl border bg-white">
        {items.length === 0 ? (
          <div className="p-6 text-center text-gray-500">Sin registros</div>
        ) : (
          <ul className="divide-y">
            {items.map((m) => {
              const status = (m.status ?? "ALTA").toUpperCase();
              const activo = status !== "BAJA";

              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {m.name ?? `#${m.id}`}
                      </span>
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs font-semibold " +
                          (activo
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700")
                        }
                      >
                        {activo ? "ACTIVADO" : "DESACTIVADO"}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700">
                      {(m.typeName ?? "—")} • {(m.brandName ?? "—")}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-md border px-3 py-1 text-sm hover:bg-slate-50"
                      onClick={() => toggleEstado(m)}
                    >
                      {activo ? "Desactivar" : "Activar"}
                    </button>

                    <button
                      className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                      type="button"
                      onClick={() => handleDeleteModel(m)}
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
 