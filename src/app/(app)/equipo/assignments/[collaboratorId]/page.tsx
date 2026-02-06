// src/app/(app)/equipo/assignments/[collaboratorId]/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/providers";
import { AssetPickerModal, type AssetRow } from "@/app/_ui/AssetPickerModal";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  User,
  Building2,
  Briefcase,
  Laptop,
  Edit,
  CheckCircle,
  Trash2,
  ClipboardList,
  Monitor,
  Copy,
  ArrowRightLeft,
} from "lucide-react";

type AssignmentApiItem = {
  id: number;
  collaboratorId: string;
  collaboratorName: string | null;
  hotelName: string | null;
  departmentName: string | null;
  assetSerial: string;
  assetLabel: string;
  platformName: string | null;
  status: "ASIGNADO" | "DEVUELTO";
  assignedAt: string;
  returnedAt: string | null;
  teamName?: string | null;
  assetTypeName?: string | null;
};

type PlatformOption = { id: number; name: string };

function rowUsesPlatform(row: AssignmentApiItem): boolean {
  const typeText = (row.assetTypeName || "").toLowerCase();
  const labelText = (row.assetLabel || "").toLowerCase();
  const text = `${typeText} ${labelText}`;

  if (
    text.includes("laptop") ||
    text.includes("portátil") ||
    text.includes("notebook") ||
    text.includes("cpu") ||
    text.includes("pc ") ||
    text.includes("desktop")
  ) {
    return true;
  }

  if (
    text.includes("diadema") ||
    text.includes("headset") ||
    text.includes("teclado") ||
    text.includes("mouse") ||
    text.includes("monitor")
  ) {
    return false;
  }

  return true;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeText(v: any): string {
  return String(v ?? "").trim();
}

function fallbackCopyToClipboard(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.left = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function CollaboratorAssignmentsPage() {
  const router = useRouter();
  const params = useParams<{ collaboratorId: string }>();
  const collaboratorId = params?.collaboratorId ?? "";

  const { fetchJSON } = useAuth();

  const [items, setItems] = useState<AssignmentApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Datos del colaborador (cargados desde API/PeopleSoft)
  type CollaboratorInfo = {
    id: string;
    name: string | null;
    departmentName: string | null;
    hotelName: string | null;
    jobTitle: string | null;
    email: string | null;
    source: "local" | "peoplesoft";
  };
  const [collaboratorInfo, setCollaboratorInfo] = useState<CollaboratorInfo | null>(null);
  const [loadingCollaborator, setLoadingCollaborator] = useState(false);

  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPlatformId, setEditingPlatformId] = useState<number | "">("");

  const [editingTeamName, setEditingTeamName] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const [copiedRowId, setCopiedRowId] = useState<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  // Transfer state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [hotels, setHotels] = useState<{ id: number; name: string }[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [selectedDestHotel, setSelectedDestHotel] = useState<number | "">("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Cargar datos del colaborador desde API/PeopleSoft
  useEffect(() => {
    if (!collaboratorId) return;

    const loadCollaboratorInfo = async () => {
      try {
        setLoadingCollaborator(true);
        const data = await fetchJSON(`/api/collaborators/${encodeURIComponent(collaboratorId)}`);
        if (data && !data.error) {
          setCollaboratorInfo({
            id: data.id || collaboratorId,
            name: data.name || null,
            departmentName: data.departmentName || data.jobTitle || null,
            hotelName: data.hotelName || null,
            jobTitle: data.jobTitle || null,
            email: data.email || null,
            source: data.source || "local",
          });
        }
      } catch (e) {
        console.error("Error al cargar datos del colaborador:", e);
        // No es un error fatal, solo no tendremos los datos
      } finally {
        setLoadingCollaborator(false);
      }
    };

    void loadCollaboratorInfo();
  }, [fetchJSON, collaboratorId]);



  const closePicker = () => {
    if (creatingAssignment) return;
    setPickerOpen(false);
    setPickerError(null);
  };

  const openNewAssignment = () => {
    if (!collaboratorId) return;
    setPickerError(null);
    setPickerOpen(true);
  };

  const handleCopySerial = useCallback(async (serialRaw: string, rowId: number) => {
    const serial = safeText(serialRaw);
    if (!serial || serial === "—") return;

    setError(null);

    let ok = false;
    try {
      const canClipboard =
        typeof navigator !== "undefined" &&
        !!navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function" &&
        typeof window !== "undefined" &&
        (window as any).isSecureContext;

      if (canClipboard) {
        await navigator.clipboard.writeText(serial);
        ok = true;
      } else {
        ok = fallbackCopyToClipboard(serial);
      }
    } catch {
      ok = fallbackCopyToClipboard(serial);
    }

    if (!ok) {
      setError("No se pudo copiar el número de serie al portapapeles.");
      return;
    }

    setCopiedRowId(rowId);
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedRowId((cur) => (cur === rowId ? null : cur));
    }, 1600);
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Cargar plataformas
  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        setLoadingPlatforms(true);
        const data = await fetchJSON("/api/catalog/platforms?onlyActive=1");
        setPlatforms(data.items ?? []);
      } catch (e) {
        console.error("Error al cargar plataformas", e);
      } finally {
        setLoadingPlatforms(false);
      }
    };
    void loadPlatforms();
  }, [fetchJSON]);

  // Cargar asignaciones
  const loadAssignments = useCallback(async () => {
    if (!collaboratorId) return;
    try {
      setLoading(true);
      setError(null);

      const data = await fetchJSON("/api/assignments");
      const all: AssignmentApiItem[] = data.items ?? [];
      const mine = all.filter((a) => a.collaboratorId === String(collaboratorId));

      setItems(mine);

      if (!editingTeamName) {
        const header = mine[0];
        setTeamNameDraft(header?.teamName ?? "");
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "No se pudo cargar el resguardo del colaborador.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchJSON, collaboratorId, editingTeamName]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  // Datos del header
  const header = items[0] ?? null;

  // Nueva asignación
  const handleSelectAssetForNewAssignment = async (asset: AssetRow) => {
    if (!collaboratorId) return;

    const assetId = asset?.id;
    if (typeof assetId !== "number" || !Number.isFinite(assetId) || assetId <= 0) {
      setPickerError("Activo inválido.");
      return;
    }

    try {
      setCreatingAssignment(true);
      setPickerError(null);
      setError(null);

      await fetchJSON("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collaboratorId: String(collaboratorId),
          collaboratorName: (collaboratorInfo?.name || header?.collaboratorName || "").trim() || String(collaboratorId),
          assetId,
          assetSerial: (asset.serial ?? "").trim() || undefined,
          assetCode: (asset.code ?? "").trim() || undefined,
          platformId: null,
        }),
      });

      setPickerOpen(false);
      setPickerError(null);
      await loadAssignments();
    } catch (e: any) {
      console.error(e);
      setPickerError(e?.message ?? "No se pudo crear la asignación.");
    } finally {
      setCreatingAssignment(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const asignados = items.filter((i) => i.status === "ASIGNADO").length;
    const devueltos = items.filter((i) => i.status === "DEVUELTO").length;
    return { total, asignados, devueltos };
  }, [items]);

  const overallStatus = stats.asignados > 0 ? "ASIGNADO" : "DEVUELTO";

  // Usar collaboratorInfo (de API/PS) como fuente primaria, fallback a header (de asignaciones)
  const collaboratorName = collaboratorInfo?.name || header?.collaboratorName || null;
  const collaboratorLabel = collaboratorName
    ? `${collaboratorName} (${collaboratorId})`
    : collaboratorId || "Colaborador desconocido";

  const hotelLabel = collaboratorInfo?.hotelName || header?.hotelName || "Sin hotel";
  const deptLabel = collaboratorInfo?.departmentName || header?.departmentName || "Sin departamento";
  const teamName = header?.teamName ?? "";

  // Edición de nombre de equipo
  const startEditTeamName = () => {
    if (!header) return;
    setEditingTeamName(true);
    setTeamNameDraft(header.teamName ?? "");
    setError(null);
  };

  const cancelEditTeamName = () => {
    setEditingTeamName(false);
    setTeamNameDraft(header?.teamName ?? "");
  };

  const handleSaveTeamName = async () => {
    if (!header) return;

    const trimmed = teamNameDraft.trim();
    if (!trimmed) {
      alert("El nombre de equipo no puede estar vacío.");
      return;
    }

    try {
      setError(null);

      await fetchJSON("/api/assignments/team-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collaboratorId: header.collaboratorId,
          teamName: trimmed,
        }),
      });

      setItems((prev) =>
        prev.map((row) =>
          row.collaboratorId === header.collaboratorId ? { ...row, teamName: trimmed } : row
        )
      );

      setEditingTeamName(false);
      setTeamNameDraft(trimmed);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "No se pudo actualizar el nombre de equipo.");
    }
  };

  // Edición de fila (plataforma)
  const startEditRow = (row: AssignmentApiItem) => {
    const current = platforms.find((p) => p.name === row.platformName)?.id ?? "";
    setEditingId(row.id);
    setEditingPlatformId(current);
    setError(null);
  };

  const cancelEditRow = () => {
    setEditingId(null);
    setEditingPlatformId("");
  };

  const handleSaveRow = async () => {
    if (!editingId) return;

    try {
      setError(null);

      await fetchJSON(`/api/assignments/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          platformId: editingPlatformId === "" ? null : Number(editingPlatformId),
        }),
      });

      cancelEditRow();
      await loadAssignments();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "No se pudieron guardar los cambios.");
    }
  };

  const handleMarkReturned = async (row: AssignmentApiItem) => {
    if (!window.confirm("¿Marcar esta asignación como devuelta?")) return;
    try {
      setError(null);
      await fetchJSON(`/api/assignments/${row.id}/end`, { method: "POST" });
      await loadAssignments();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "No se pudo marcar como devuelta.");
    }
  };

  const handleDelete = async (row: AssignmentApiItem) => {
    if (!window.confirm("¿Eliminar esta asignación devuelta?")) return;
    try {
      setError(null);
      await fetchJSON(`/api/assignments/${row.id}`, { method: "DELETE" });
      await loadAssignments();
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "No se pudo eliminar la asignación.");
    }
  };

  // ============ Transfer Functions ============

  const loadHotels = async () => {
    try {
      setLoadingHotels(true);
      const data = await fetchJSON("/api/catalog/hotels");
      setHotels(data.items ?? []);
    } catch (e) {
      console.error("Error al cargar hoteles", e);
    } finally {
      setLoadingHotels(false);
    }
  };

  const openTransferModal = () => {
    if (stats.asignados === 0) {
      setError("No hay equipos asignados para transferir.");
      return;
    }
    setTransferError(null);
    setSelectedDestHotel("");
    setTransferModalOpen(true);
    void loadHotels();
  };

  const handleInitiateTransfer = async () => {
    if (!selectedDestHotel) {
      setTransferError("Debes seleccionar un hotel destino.");
      return;
    }

    if (!window.confirm(`¿Transferir todos los equipos de ${header?.collaboratorName || collaboratorId} al hotel seleccionado?`)) {
      return;
    }

    try {
      setTransferring(true);
      setTransferError(null);

      const response = await fetchJSON("/api/assignments/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collaboratorId,
          collaboratorName: header?.collaboratorName || null,
          destHotelId: selectedDestHotel,
        }),
      });

      setTransferModalOpen(false);
      alert(response.message || "Transferencia iniciada exitosamente.");
      router.push("/equipo/assignments/control");
    } catch (e: any) {
      console.error(e);
      setTransferError(e?.message || "No se pudo iniciar la transferencia.");
    } finally {
      setTransferring(false);
    }
  };


  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            Resguardo del Colaborador
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Equipos asignados actualmente al colaborador seleccionado.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/equipo/assignments/control")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al control
          </button>
          <button
            onClick={() => void loadAssignments()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refrescar
          </button>
        </div>
      </header>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          <p className="mt-2 text-sm text-slate-500">Cargando resguardo...</p>
        </div>
      )}

      {/* Info del colaborador */}
      {!loading && (
        <>
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Información del Colaborador
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Colaborador</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {collaboratorName || "—"}
                    </p>
                    <p className="text-xs text-slate-500">ID: {collaboratorId}</p>

                    {/* Nombre de equipo */}
                    {editingTeamName ? (
                      <div className="mt-2 space-y-2">
                        <input
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          value={teamNameDraft}
                          onChange={(e) => setTeamNameDraft(e.target.value)}
                          placeholder="Ej. CJUAREZ"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveTeamName}
                            className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={cancelEditTeamName}
                            className="px-3 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-slate-500">Equipo:</span>
                        <span className="text-xs font-medium text-slate-700">
                          {teamName || "Sin nombre"}
                        </span>
                        {header && (
                          <button
                            onClick={startEditTeamName}
                            className="text-xs text-indigo-600 hover:underline"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Hotel</p>
                    <p className="text-sm text-slate-800">{hotelLabel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Departamento</p>
                    <p className="text-sm text-slate-800">{deptLabel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Estado</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${overallStatus === "ASIGNADO"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {overallStatus === "ASIGNADO" ? "Con equipos" : "Sin equipos"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats compactas */}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                  <Laptop className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Total equipos:</span>
                  <span className="text-sm font-bold text-slate-800">{stats.total}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-700">Asignados:</span>
                  <span className="text-sm font-bold text-emerald-800">{stats.asignados}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                  <Laptop className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Devueltos:</span>
                  <span className="text-sm font-bold text-slate-800">{stats.devueltos}</span>
                </div>

                <div className="ml-auto print:hidden flex gap-2">
                  <button
                    onClick={openTransferModal}
                    disabled={stats.asignados === 0 || transferring}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Transferir Asignaciones
                  </button>
                  <button
                    onClick={openNewAssignment}
                    disabled={!collaboratorId || creatingAssignment}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Asignación
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Tabla de equipos */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Equipos en Resguardo
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Lista de equipos asignados a este colaborador.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 text-left">Equipo</th>
                    <th className="px-4 py-3 text-left">Número de Serie</th>
                    <th className="px-4 py-3 text-left">Plataforma</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Fechas</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <Laptop className="w-12 h-12 text-slate-300 mx-auto" />
                        <p className="mt-2 text-sm text-slate-500">
                          Este colaborador no tiene equipos en resguardo.
                        </p>
                      </td>
                    </tr>
                  )}

                  {items.map((row) => {
                    const isEditing = editingId === row.id;
                    const supportsPlatform = rowUsesPlatform(row);
                    const serial = safeText(row.assetSerial);

                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-800 whitespace-pre-wrap">
                            {row.assetLabel}
                          </div>
                        </td>

                        {/* CLICK PARA COPIAR SERIAL */}
                        <td className="px-4 py-4">
                          {serial ? (
                            <button
                              type="button"
                              onClick={() => void handleCopySerial(serial, row.id)}
                              className="group inline-flex items-center gap-2 font-mono text-slate-700 hover:text-slate-900"
                              title="Copiar número de serie"
                              aria-label={`Copiar número de serie ${serial}`}
                            >
                              <span className="underline-offset-4 group-hover:underline">
                                {serial}
                              </span>

                              {copiedRowId === row.id ? (
                                <span className="inline-flex items-center gap-1 text-xs font-sans text-emerald-700">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Copiado
                                </span>
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                              )}
                            </button>
                          ) : (
                            <span className="font-mono text-slate-700">—</span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {isEditing ? (
                            <select
                              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                              value={editingPlatformId}
                              onChange={(e) =>
                                setEditingPlatformId(e.target.value ? Number(e.target.value) : "")
                              }
                              disabled={loadingPlatforms}
                            >
                              <option value="">Sin plataforma</option>
                              {platforms.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-600">
                              {row.platformName || "—"}
                              {!supportsPlatform && (
                                <span className="block text-xs text-slate-400 mt-1">
                                  (No requiere licencia)
                                </span>
                              )}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${row.status === "ASIGNADO"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {row.status === "ASIGNADO" ? "Asignado" : "Devuelto"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-xs text-slate-600">
                          <div>
                            <span className="font-medium">Asignado:</span>{" "}
                            {formatDateTime(row.assignedAt)}
                          </div>
                          {row.returnedAt && (
                            <div className="mt-1">
                              <span className="font-medium">Devuelto:</span>{" "}
                              {formatDateTime(row.returnedAt)}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-4 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={handleSaveRow}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={cancelEditRow}
                                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEditRow(row)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Editar
                              </button>

                              {row.status === "ASIGNADO" && (
                                <button
                                  onClick={() => handleMarkReturned(row)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Marcar devuelto
                                </button>
                              )}

                              {row.status === "DEVUELTO" && (
                                <button
                                  onClick={() => handleDelete(row)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Eliminar
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Modal */}
      <AssetPickerModal
        open={pickerOpen}
        onClose={closePicker}
        onSelect={(asset) => void handleSelectAssetForNewAssignment(asset)}
        subtitle="Selecciona un equipo disponible para asignar."
        actionLabel={creatingAssignment ? "Asignando..." : "Usar este equipo"}
        busy={creatingAssignment}
        externalError={pickerError}
      />

      {/* Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
            {/* Header */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Transferir Asignaciones del Colaborador
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Transfiere todos los equipos asignados a otro hotel
              </p>
            </div>

            {/* Body */}
            <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6 space-y-4">
              {/* Collaborator Info */}
              <div className="rounded-xl bg-indigo-50 p-4 border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-200 text-lg font-bold text-indigo-800">
                    {(header?.collaboratorName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Nombre</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {header?.collaboratorName || "Sin nombre"}
                    </p>
                    <p className="text-xs text-slate-600">ID: {collaboratorId}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">Hotel actual:</span> {hotelLabel}
                  </p>
                </div>
              </div>

              {/* Destination Hotel */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                  Seleccionar hotel destino
                </label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  value={selectedDestHotel}
                  onChange={(e) => setSelectedDestHotel(e.target.value ? Number(e.target.value) : "")}
                  disabled={loadingHotels}
                >
                  <option value="">
                    {loadingHotels ? "Cargando hoteles..." : "Seleccionar hotel destino"}
                  </option>
                  {hotels
                    .filter((h) => header?.hotelName ? h.name !== header.hotelName : true)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Equipment Preview */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Vista previa de equipos</p>
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-2 text-left">Equipo</th>
                        <th className="px-3 py-2 text-left">Serial</th>
                        <th className="px-3 py-2 text-left">Plataforma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items
                        .filter((i) => i.status === "ASIGNADO")
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-700">{item.assetLabel}</td>
                            <td className="px-3 py-2 font-mono text-slate-600">{item.assetSerial}</td>
                            <td className="px-3 py-2 text-slate-600">{item.platformName || "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                  <strong>{stats.asignados}</strong> equipo(s) serán transferidos
                </p>
              </div>

              {/* Error Message */}
              {transferError && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {transferError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setTransferModalOpen(false)}
                disabled={transferring}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleInitiateTransfer}
                disabled={transferring || !selectedDestHotel}
                className="px-6 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50"
              >
                {transferring ? "Transfiriendo..." : "Confirmar Transferencia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
