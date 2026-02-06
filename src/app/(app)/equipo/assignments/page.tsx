// src/app/(app)/equipo/assignments/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

type HotelOption = {
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
  source?: "local" | "peoplesoft";
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
  hotelId?: number | null;
  hotelName?: string | null;
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
  const searchParams = useSearchParams();

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

  // Auto-populate from URL query params (when redirected from assets page)
  useEffect(() => {
    const assetCodeFromUrl = searchParams.get("assetCode");
    if (assetCodeFromUrl && !assetCode) {
      setAssetCode(assetCodeFromUrl);
      // Trigger requirements check
      void refreshAssetRequirements(assetCodeFromUrl);
    }
  }, [searchParams]);
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
  const [manualMode, setManualMode] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");

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

  // ------- hoteles para filtro en modal -------
  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState<number | "">("")

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

  // ===================== hoteles =====================
  async function loadHotels() {
    setLoadingHotels(true);
    try {
      const data = await fetchJSON("/api/catalog/hotels");
      const items: HotelOption[] = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      setHotels(items);
    } catch (err) {
      console.error("Error al cargar hoteles", err);
    } finally {
      setLoadingHotels(false);
    }
  }

  useEffect(() => {
    loadPlatforms();
    loadHotels();
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
    setManualMode(false);

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

      // Mostrar origen de los datos
      const sourceLabel = data.source === "peoplesoft" ? "PeopleSoft" : "BD Local";
      setAddressText(`Dirección del colaborador (${sourceLabel})`);
      setDepartmentText(
        data?.departmentName ??
        data?.jobTitle ??
        `Gerencia / departamento (${sourceLabel})`,
      );
    } catch (err: any) {
      console.error("Colaborador no encontrado o error:", err);
      setFindError(err?.message || "Colaborador no encontrado. Puedes capturar los datos manualmente.");
      setFoundCollaborator(null);
      setCollaboratorName("");
      setTeamName("");
      setAddressText("Dirección del colaborador");
      setDepartmentText("Se llenará desde PeopleSoft");
    } finally {
      setFinding(false);
    }
  }

  // ===================== captura manual =====================
  function handleEnableManualMode() {
    setManualMode(true);
    setFindError(null);
    setFoundCollaborator(null);
    setAddressText("Captura manual");
    setDepartmentText("Captura manual");
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
  async function loadAssetPicker(hotelId?: number | "") {
    setAssetPickerLoading(true);
    setAssetPickerError(null);
    try {
      let url = "/api/assets/available?pageSize=200";
      if (typeof hotelId === "number") {
        url += `&hotelId=${hotelId}`;
      }
      const data = await fetchJSON(url);
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
    setSelectedHotelId("");
    setAssetPickerOpen(true);
    void loadAssetPicker();
  }

  function handleHotelFilterChange(hotelId: number | "") {
    setSelectedHotelId(hotelId);
    void loadAssetPicker(hotelId);
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Monitor className="w-7 h-7 text-indigo-600" />
            Asignaciones de equipo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Registra y consulta qué equipo está asignado a cada colaborador.
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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
              Nombre del colaborador {manualMode ? "(requerido)" : "(opcional)"}
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className={`w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none ${foundCollaborator && !manualMode
                  ? "cursor-not-allowed bg-slate-100 text-slate-500"
                  : "bg-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  }`}
                placeholder="Nombre Apellido"
                value={collaboratorName}
                onChange={(e) => setCollaboratorName(e.target.value)}
                readOnly={!!foundCollaborator && !manualMode}
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
                    ? "border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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
                  ? "border-slate-200 bg-slate-50 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
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
              className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              placeholder="Notas adicionales sobre esta asignación"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>
        </div>

        {/* mensajes */}
        {findError && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{findError}</span>
            </div>
            <button
              type="button"
              onClick={handleEnableManualMode}
              className="ml-4 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
            >
              ✏️ Captura manual
            </button>
          </div>
        )}
        {createError && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {createError}
          </div>
        )}
        {createSuccess && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {createSuccess}
          </div>
        )}

        {/* Resultado de búsqueda de colaborador */}
        {foundCollaborator && (
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                <User className="h-4 w-4" />
                Colaborador encontrado
              </h3>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${foundCollaborator.source === "peoplesoft"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
                }`}>
                {foundCollaborator.source === "peoplesoft" ? "📡 PeopleSoft" : "💾 BD Local"}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-4 text-sm">
              <div>
                <span className="text-slate-500 text-xs">ID / EMPLID</span>
                <p className="font-mono font-semibold text-slate-800">{foundCollaborator.id}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Nombre</span>
                <p className="font-semibold text-slate-800">{foundCollaborator.name || "—"}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Departamento / Puesto</span>
                <p className="text-slate-800">{foundCollaborator.departmentName || foundCollaborator.jobTitle || "—"}</p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Email / Teléfono</span>
                <p className="text-slate-800">{foundCollaborator.email || foundCollaborator.phone || "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Modo captura manual */}
        {manualMode && !foundCollaborator && (
          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <User className="h-4 w-4" />
                Captura manual de colaborador
              </h3>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                ✏️ Manual
              </span>
            </div>
            <p className="text-xs text-amber-700 mb-3">
              PeopleSoft no está disponible o el colaborador no fue encontrado. Ingresa los datos manualmente.
            </p>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="colaborador@empresa.com"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Gerencia / Departamento (opcional)
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Ej. Tecnología / Sistemas"
                  value={manualDepartment}
                  onChange={(e) => setManualDepartment(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creando..." : "Crear asignación"}
          </button>
        </div>
      </form>

      {/* =============== MODAL CAPTURA DE INVENTARIO =============== */}
      {assetPickerOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-800">Captura de inventario</h3>
                <p className="text-sm text-slate-500">
                  Selecciona un equipo disponible para asignar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssetPickerOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filtros */}
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
              <div className="grid gap-3 md:grid-cols-2">
                {/* Filtro por hotel */}
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Filtrar por hotel/zona
                  </label>
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    value={selectedHotelId}
                    onChange={(e) => handleHotelFilterChange(e.target.value ? Number(e.target.value) : "")}
                    disabled={loadingHotels}
                  >
                    <option value="">
                      {loadingHotels ? "Cargando..." : "Todos mis hoteles"}
                    </option>
                    {hotels.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filtro por tipo */}
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Filtrar por tipo
                  </label>
                  <input
                    type="text"
                    placeholder='Ej. "LAP", "CPU", "RAD"...'
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    value={assetTypeFilter}
                    onChange={(e) => setAssetTypeFilter(e.target.value)}
                  />
                </div>
              </div>
              {assetPickerLoading && (
                <p className="mt-2 text-xs text-slate-500">
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
