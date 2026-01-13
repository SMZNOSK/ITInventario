// src/app/(app)/equipo/assignments/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/providers";
import {
  Monitor,
  Hash,
  User,
  Search,
  Building2,
  Layers,
  FileText,
  Tag,
  Package,
  X,
} from "lucide-react";

type PlatformOption = {
  id: number;
  name: string;
};

type Collaborator = {
  id: string;
  name: string | null;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  departmentName?: string | null;
  teamName?: string | null;
};

type AssetLookup = {
  id?: number;
  code?: string | null;
  serial?: string | null;
  typeName?: string | null;
  type?: {
    name?: string | null;
  } | null;
};

type AssetPickerItem = AssetLookup & {
  brandName?: string | null;
  modelName?: string | null;
};

// --- reglas para plataforma / nombre de equipo según tipo ---
function assetNeedsPlatform(asset: AssetLookup | null): boolean {
  if (!asset) return false;

  const rawTypeName =
    asset.typeName ??
    asset.type?.name ??
    (asset as any).type_name ??
    (asset as any).type_label ??
    null;

  const code = (asset.code ?? "").toUpperCase().trim();

  // Por código
  if (code.startsWith("CPU-") || code.startsWith("CPU")) return true;
  if (code.startsWith("LAP-") || code.startsWith("LAP")) return true;

  // Por nombre
  if (!rawTypeName || typeof rawTypeName !== "string") return false;
  const t = rawTypeName.toUpperCase().trim();

  const KEYWORDS = [
    "CPU",
    "DESKTOP",
    "ESCRITORIO",
    "TORRE",
    "LAPTOP",
    "LAP TOP",
    "NOTEBOOK",
    "PORTATIL",
    "PORTÁTIL",
  ];

  return KEYWORDS.some((kw) => t.includes(kw));
}

export default function AssignmentsPage() {
  const { fetchJSON } = useAuth();

  // ------- formulario -------
  const [assetCode, setAssetCode] = useState("");
  const [collaboratorId, setCollaboratorId] = useState("");
  const [collaboratorName, setCollaboratorName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [platformId, setPlatformId] = useState<number | null>(null);
  const [comments, setComments] = useState("");

  const [requiresPlatform, setRequiresPlatform] = useState(false);
  const [requiresTeamName, setRequiresTeamName] = useState(false);

  const [addressText, setAddressText] = useState("Dirección del colaborador");
  const [departmentText, setDepartmentText] = useState(
    "Se llenará desde PeopleSoft",
  );

  // ------- catálogos -------
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);

  // ------- colaborador -------
  const [foundCollaborator, setFoundCollaborator] =
    useState<Collaborator | null>(null);
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  // ------- submit -------
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const collaboratorHasTeamName =
    !!(foundCollaborator?.teamName && foundCollaborator.teamName.trim().length);

  // ------- modal inventario -------
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerLoading, setAssetPickerLoading] = useState(false);
  const [assetPickerItems, setAssetPickerItems] = useState<AssetPickerItem[]>(
    [],
  );
  const [assetPickerError, setAssetPickerError] = useState<string | null>(null);

  // filtro de tipo (texto libre: LAP, CPU, RAD...)
  const [assetTypeFilter, setAssetTypeFilter] = useState("");

  // ===================== plataformas =====================
  async function loadPlatforms() {
    setLoadingPlatforms(true);
    try {
      const data = await fetchJSON("/api/catalog/platforms?onlyActive=1");
      const items: PlatformOption[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      setPlatforms(items);
    } catch (err) {
      console.error("Error al cargar plataformas", err);
    } finally {
      setLoadingPlatforms(false);
    }
  }

  useEffect(() => {
    loadPlatforms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===================== reglas por tipo de equipo =====================
  async function refreshAssetRequirements(code: string) {
    const trimmed = code.trim();

    if (!trimmed) {
      setRequiresPlatform(false);
      setRequiresTeamName(false);
      setPlatformId(null);
      return;
    }

    try {
      const asset = (await fetchJSON(
        `/api/assets/by-code/${encodeURIComponent(trimmed)}`,
      )) as AssetLookup;

      const needs = assetNeedsPlatform(asset);
      setRequiresPlatform(needs);
      setRequiresTeamName(needs);

      if (!needs) {
        setPlatformId(null);
      }
    } catch (err) {
      console.error("Error al consultar equipo por código", err);
      setRequiresPlatform(false);
      setRequiresTeamName(false);
      setPlatformId(null);
    }
  }

  async function handleAssetBlur() {
    await refreshAssetRequirements(assetCode);
  }

  // ===================== buscar colaborador =====================
  async function handleFindCollaborator() {
    const id = collaboratorId.trim();
    setFindError(null);
    setFoundCollaborator(null);
    setCreateSuccess(null);

    if (!id) {
      setFindError("Debes indicar el número de colaborador.");
      return;
    }

    setFinding(true);
    try {
      const data = (await fetchJSON(
        `/api/collaborators/${encodeURIComponent(id)}`,
      )) as Collaborator;

      setFoundCollaborator(data);
      setCollaboratorName(data?.name ?? "");
      setTeamName(data?.teamName ?? "");

      setAddressText("Dirección del colaborador (desde PeopleSoft)");
      setDepartmentText(
        data?.departmentName ??
          data?.jobTitle ??
          "Gerencia / departamento (desde PeopleSoft)",
      );
    } catch (err: any) {
      console.error("Colaborador no encontrado o error:", err);
      setFindError(err?.message || "Colaborador no encontrado");
      setFoundCollaborator(null);
      setCollaboratorName("");
      setTeamName("");
      setAddressText("Dirección del colaborador");
      setDepartmentText("Se llenará desde PeopleSoft");
    } finally {
      setFinding(false);
    }
  }

  // ===================== crear asignación =====================
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const trimmedAsset = assetCode.trim();
    const trimmedCollabId = collaboratorId.trim();
    const trimmedName = collaboratorName.trim();
    const trimmedTeamName = teamName.trim();

    if (!trimmedAsset) {
      setCreateError("Debes indicar el ID o serial del equipo.");
      return;
    }
    if (!trimmedCollabId) {
      setCreateError("Debes indicar el número de colaborador.");
      return;
    }

    const mustHavePlatform = requiresPlatform;
    const mustHaveTeamName =
      requiresTeamName && !collaboratorHasTeamName; // solo la primera vez

    if (mustHaveTeamName && !trimmedTeamName) {
      setCreateError(
        "Debes capturar el Nombre de equipo para este colaborador (solo se pide la primera vez en laptops/CPU).",
      );
      return;
    }

    if (mustHavePlatform && !platformId) {
      setCreateError(
        "Este tipo de equipo requiere una plataforma/licencia. Selecciona una antes de crear la asignación.",
      );
      return;
    }

    setCreating(true);
    try {
      const payload: any = {
        assetCode: trimmedAsset,
        collaboratorId: trimmedCollabId,
        collaboratorName: trimmedName || null,
        platformId: mustHavePlatform ? platformId : null,
      };

      if (requiresTeamName) {
        payload.teamName = collaboratorHasTeamName
          ? foundCollaborator?.teamName ?? null
          : trimmedTeamName || null;
      }

      await fetchJSON("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setCreateSuccess("Asignación creada correctamente.");

      setAssetCode("");
      setComments("");
      setRequiresPlatform(false);
      setRequiresTeamName(false);
      setPlatformId(null);
    } catch (err: any) {
      console.error("Error al crear asignación", err);
      setCreateError(err?.message || "Error al crear asignación");
    } finally {
      setCreating(false);
    }
  }

  // ===================== modal inventario =====================
  async function loadAssetPicker() {
    setAssetPickerLoading(true);
    setAssetPickerError(null);
    try {
      const data = await fetchJSON("/api/assets/available?pageSize=200");
      const items: AssetPickerItem[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      setAssetPickerItems(items);
    } catch (err: any) {
      console.error("Error al cargar activos disponibles", err);
      setAssetPickerError(
        err?.message || "Error al cargar activos disponibles",
      );
    } finally {
      setAssetPickerLoading(false);
    }
  }

  function handleOpenAssetPicker() {
    setAssetTypeFilter("");
    setAssetPickerOpen(true);
    void loadAssetPicker();
  }

  function handleUseAsset(item: AssetPickerItem) {
    const value = (item.serial || item.code || "").trim();
    if (!value) return;
    setAssetCode(value);
    void refreshAssetRequirements(value);
    setAssetPickerOpen(false);
  }

  // filtro texto simple por tipo / código (LAP, CPU, RAD…)
  const filteredAssets = assetPickerItems.filter((a) => {
    const term = assetTypeFilter.trim().toUpperCase();
    if (!term) return true;
    const typeText = (a.typeName || a.code || "").toUpperCase();
    return typeText.includes(term);
  });

  // ===================== UI =====================
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Asignaciones de equipo
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Registra y consulta qué equipo está asignado a cada colaborador.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-base font-semibold text-slate-900">
          Crear asignación
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Equipo */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Equipo (ID o serial)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Monitor className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
                  placeholder="Ej. 1 o TEST-001"
                  value={assetCode}
                  onChange={(e) => setAssetCode(e.target.value)}
                  onBlur={handleAssetBlur}
                />
              </div>
              <button
                type="button"
                onClick={handleOpenAssetPicker}
                className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-amber-300"
              >
                <Package className="h-4 w-4" />
                Inventario
              </button>
            </div>
          </div>

          {/* Número colaborador */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Número de colaborador
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
                  placeholder="Ej. 00012345"
                  value={collaboratorId}
                  onChange={(e) => setCollaboratorId(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleFindCollaborator}
                disabled={finding}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                {finding ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>

          {/* Nombre colaborador */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Nombre del colaborador (opcional)
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
                placeholder="Nombre Apellido"
                value={collaboratorName}
                onChange={(e) => setCollaboratorName(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Dirección / Gerencia / Plataforma */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Dirección
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-500"
                value={addressText}
                readOnly
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Gerencia / Departamento
            </label>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-500"
                value={departmentText}
                readOnly
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Plataforma
            </label>
            <div className="relative">
              <Layers className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <select
                className={
                  "w-full appearance-none rounded-xl border py-2 pl-9 pr-8 text-sm outline-none " +
                  (requiresPlatform
                    ? "border-slate-200 bg-slate-50 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400")
                }
                disabled={!requiresPlatform || loadingPlatforms}
                value={requiresPlatform ? platformId ?? "" : ""}
                onChange={(e) =>
                  setPlatformId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">
                  {!requiresPlatform
                    ? "No aplica"
                    : loadingPlatforms
                    ? "Cargando plataformas..."
                    : "Selecciona una plataforma"}
                </option>
                {platforms.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Nombre de equipo */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Nombre de equipo
          </label>
          <div className="relative">
            <Tag className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              className={
                "w-full rounded-xl border py-2 pl-9 pr-3 text-sm outline-none " +
                (requiresTeamName && !collaboratorHasTeamName
                  ? "border-slate-200 bg-slate-50 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
                  : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400")
              }
              placeholder={
                !requiresTeamName
                  ? "No aplica para este tipo de equipo"
                  : collaboratorHasTeamName
                  ? "Se usará el nombre de equipo registrado"
                  : "Ej. GGUERREROMID"
              }
              value={
                collaboratorHasTeamName
                  ? foundCollaborator?.teamName ?? ""
                  : teamName
              }
              onChange={(e) =>
                !collaboratorHasTeamName &&
                setTeamName(e.target.value.toUpperCase())
              }
              readOnly={!requiresTeamName || collaboratorHasTeamName}
            />
          </div>
        </div>

        {/* Comentarios */}
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-500">
            Comentarios (opcional)
          </label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <textarea
              className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
              placeholder="Notas adicionales sobre esta asignación"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
        </div>

        {/* mensajes */}
        {findError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {findError}
          </div>
        )}
        {createError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {createError}
          </div>
        )}
        {createSuccess && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {createSuccess}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center rounded-2xl bg-violet-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creando..." : "Crear asignación"}
          </button>
        </div>
      </form>

      {/* =============== MODAL CAPTURA DE INVENTARIO =============== */}
      {assetPickerOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Captura de inventario
                </p>
                <p className="text-xs text-slate-500">
                  Selecciona un equipo disponible para asignar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssetPickerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filtro por tipo */}
            <div className="border-b bg-slate-50 px-6 py-3">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Filtrar por tipo
              </label>
              <input
                type="text"
                placeholder='Ej. "LAP", "CPU", "RAD"...'
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200"
                value={assetTypeFilter}
                onChange={(e) => setAssetTypeFilter(e.target.value)}
              />
              {assetPickerLoading && (
                <p className="mt-1 text-[11px] text-slate-500">
                  Cargando equipos disponibles...
                </p>
              )}
            </div>

            {/* Tabla */}
            <div className="max-h-[60vh] overflow-auto px-6 pb-4 pt-2">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Tipo</th>
                    <th className="py-2 pr-4">Marca</th>
                    <th className="py-2 pr-4">Modelo</th>
                    <th className="py-2 pr-4">Número de serie / ID</th>
                    <th className="py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {assetPickerError && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-4 text-center text-xs text-red-500"
                      >
                        {assetPickerError}
                      </td>
                    </tr>
                  )}

                  {!assetPickerError && !assetPickerLoading && (
                    <>
                      {filteredAssets.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-4 text-center text-xs text-slate-500"
                          >
                            No hay equipos disponibles con ese filtro.
                          </td>
                        </tr>
                      ) : (
                        filteredAssets.map((item) => (
                          <tr
                            key={item.id ?? `${item.code}-${item.serial}`}
                            className="border-b last:border-0"
                          >
                            <td className="py-2 pr-4 text-slate-800">
                              {item.typeName ?? "—"}
                            </td>
                            <td className="py-2 pr-4 text-slate-800">
                              {item.brandName ?? "—"}
                            </td>
                            <td className="py-2 pr-4 text-slate-800">
                              {item.modelName ?? "—"}
                            </td>
                            <td className="py-2 pr-4 font-mono text-[11px] text-slate-800">
                              {item.serial || item.code || "—"}
                            </td>
                            <td className="py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleUseAsset(item)}
                                className="inline-flex items-center rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-slate-900 hover:bg-amber-300"
                              >
                                Usar este equipo
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
