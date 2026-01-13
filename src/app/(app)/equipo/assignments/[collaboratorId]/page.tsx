// src/app/(app)/equipo/assignments/[collaboratorId]/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/providers";
import { AssetPickerModal, type AssetRow } from "@/app/_ui/AssetPickerModal";
import {
  ArrowLeft,
  RefreshCw,
  Printer,
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

export default function CollaboratorAssignmentsPage() {
  const router = useRouter();
  const params = useParams<{ collaboratorId: string }>();
  const collaboratorId = params?.collaboratorId ?? "";

  const { fetchJSON } = useAuth();

  const [items, setItems] = useState<AssignmentApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPlatformId, setEditingPlatformId] = useState<number | "">("");

  const [editingTeamName, setEditingTeamName] = useState(false);
  const [teamNameDraft, setTeamNameDraft] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingAssignment, setCreatingAssignment] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

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
          collaboratorName: (header?.collaboratorName ?? "").trim() || String(collaboratorId),
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

  const collaboratorLabel = header?.collaboratorName
    ? `${header.collaboratorName} (${header.collaboratorId})`
    : collaboratorId || "Colaborador desconocido";

  const hotelLabel = header?.hotelName ?? "Sin hotel";
  const deptLabel = header?.departmentName ?? "Sin departamento";
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
          row.collaboratorId === header.collaboratorId
            ? { ...row, teamName: trimmed }
            : row
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
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900"
          >
            <Printer className="w-4 h-4" />
            Imprimir
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
                      {header?.collaboratorName || "—"}
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

                <div className="ml-auto print:hidden">
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

                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-800 whitespace-pre-wrap">
                            {row.assetLabel}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-slate-700">
                          {row.assetSerial}
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
    </div>
  );
}
