// src/app/(app)/equipo/assignments/manual/[key]/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
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
  Mail,
  ArrowRightLeft,
} from "lucide-react";

/* ========= Tipos ========= */

type ManualAssignmentItem = {
  id: number | string;
  collaboratorName?: string | null;
  collaboratorEmail?: string | null;
  department?: string | null;
  hotel?: string | null;
  hotelLabel?: string | null;
  hotelName?: string | null;
  equipmentLabel?: string | null;
  equipmentName?: string | null;
  assetLabel?: string | null;
  assetSerial?: string | null;
  serial?: string | null;
  teamName?: string | null;
  platformName?: string | null;
  status?: string | null;
  assignedAt?: string | null;
  returnedAt?: string | null;
  createdAt?: string | null;
  notes?: string | null;
};

type Platform = { id: number | string; name: string };

function safeText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") {
    return String(v).trim();
  }
  return "";
}

function normalizeKey(s: string) {
  return s.trim().toLowerCase();
}

function pickHotel(a: ManualAssignmentItem): string {
  return safeText(a.hotelLabel) || safeText(a.hotelName) || safeText(a.hotel) || "—";
}

function pickSerial(a: ManualAssignmentItem): string {
  return safeText(a.serial) || safeText(a.assetSerial) || "—";
}

function pickEquipment(a: ManualAssignmentItem): string {
  return safeText(a.equipmentName) || safeText(a.equipmentLabel) || safeText(a.assetLabel) || "—";
}

function pickHeaderTeamName(items: ManualAssignmentItem[]): string {
  for (const it of items) {
    const t = safeText(it.teamName);
    if (t) return t;
  }
  return "";
}

function keyVariantsOf(a: ManualAssignmentItem): string[] {
  const name = safeText(a.collaboratorName);
  const email = safeText(a.collaboratorEmail);
  const hotel = pickHotel(a);
  const dept = safeText(a.department);

  const v1 = `${name}||${email}||${hotel}||${dept}`;
  const v2 = `${name}||${hotel}||${dept}`;
  const v3 = `${name}`;

  return [v1, v2, v3].filter((x) => safeText(x).length > 0);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pickAssetCodeFromPicker(asset: AssetRow): string {
  const code = safeText(asset?.code);
  if (code) return code;
  const serial = safeText(asset?.serial);
  if (serial) return serial;
  return asset?.id != null ? String(asset.id) : "";
}

/* ========= Página ========= */

export default function ManualResguardoPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const rawKey = (params as any)?.key;
  const key = useMemo(() => {
    const first = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    const decoded = first ? decodeURIComponent(String(first)) : "";
    return decoded;
  }, [rawKey]);

  const printMode = searchParams.get("print") === "1";

  const [all, setAll] = useState<ManualAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editPlatformName, setEditPlatformName] = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Transfer state
  const { fetchJSON } = useAuth();
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [hotels, setHotels] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedDestHotel, setSelectedDestHotel] = useState<number | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/assignments/manual", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Error HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => null);
      const list = (data?.items ?? data ?? []) as ManualAssignmentItem[];
      setAll(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.message ?? "Error al cargar el resguardo");
      setAll([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPlatforms() {
      try {
        setPlatformsLoading(true);
        const res = await fetch("/api/catalog/platforms", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;

        const data = await res.json().catch(() => null);
        const list = (data?.items ?? data ?? []) as Platform[];
        if (!cancelled) setPlatforms(Array.isArray(list) ? list : []);
      } finally {
        if (!cancelled) setPlatformsLoading(false);
      }
    }

    loadPlatforms();
    return () => { cancelled = true; };
  }, []);

  const items = useMemo(() => {
    const k = normalizeKey(key);
    if (!k) return [];
    return all.filter((a) => keyVariantsOf(a).some((v) => normalizeKey(v) === k));
  }, [all, key]);

  const keyParts = useMemo(() => {
    const parts = key.split("||").map((x) => x.trim());
    return {
      name: parts[0] || "",
      email: parts[1] || "",
      hotel: parts[2] || "",
      dept: parts[3] || "",
    };
  }, [key]);

  const header = useMemo(() => {
    const first = items[0];
    return {
      collaboratorName: safeText(first?.collaboratorName) || safeText(keyParts.name) || "—",
      collaboratorEmail: safeText(first?.collaboratorEmail) || safeText(keyParts.email),
      hotel: pickHotel((first ?? {}) as any) || safeText(keyParts.hotel) || "—",
      department: safeText(first?.department) || safeText(keyParts.dept) || "—",
      teamName: pickHeaderTeamName(items),
    };
  }, [items, keyParts]);

  const stats = useMemo(() => {
    let assigned = 0;
    let returned = 0;

    for (const a of items) {
      const st = safeText(a.status).toUpperCase();
      if (st === "ASIGNADO") assigned += 1;
      else if (st === "DEVUELTO") returned += 1;
    }

    return { total: items.length, assigned, returned, hasAssigned: assigned > 0 };
  }, [items]);

  useEffect(() => {
    if (!printMode || loading || error) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [printMode, loading, error]);

  function beginEdit(row: ManualAssignmentItem) {
    setEditingId(String(row.id));
    setEditTeamName(safeText(row.teamName));
    setEditPlatformName(safeText(row.platformName));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTeamName("");
    setEditPlatformName("");
  }

  async function saveEdit(row: ManualAssignmentItem) {
    const id = encodeURIComponent(String(row.id));
    const payload = {
      teamName: editTeamName || null,
      platformName: editPlatformName || null,
    };

    try {
      const res = await fetch(`/api/assignments/manual/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      cancelEdit();
      await load();
    } catch (e: any) {
      alert(e?.message ?? "No se pudo guardar");
    }
  }

  async function markReturned(row: ManualAssignmentItem) {
    const id = encodeURIComponent(String(row.id));
    try {
      const res = await fetch(`/api/assignments/manual/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DEVUELTO" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      alert(e?.message ?? "No se pudo marcar devuelto");
    }
  }

  async function removeRow(row: ManualAssignmentItem) {
    if (!confirm("¿Eliminar este registro?")) return;
    const id = encodeURIComponent(String(row.id));
    try {
      const res = await fetch(`/api/assignments/manual/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      alert(e?.message ?? "No se pudo eliminar");
    }
  }

  async function loadHotels() {
    try {
      const res = await fetch("/api/hotels/active", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();
      setHotels(data.items ?? []);
    } catch (e: any) {
      console.error("Error cargando hoteles:", e);
      setTransferError("No se pudieron cargar los hoteles.");
    }
  }

  async function openTransferModal() {
    setTransferModalOpen(true);
    setTransferError(null);
    setSelectedDestHotel(null);
    await loadHotels();
  }

  async function handleInitiateTransfer() {
    if (!selectedDestHotel) {
      setTransferError("Selecciona un hotel destino.");
      return;
    }

    setTransferring(true);
    setTransferError(null);

    try {
      const payload = {
        collaboratorKey: key,
        collaboratorName: header.collaboratorName,
        destHotelId: selectedDestHotel,
      };

      const response = await fetchJSON("/api/assignments/manual/transfers", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert(response.message || "Transferencia iniciada exitosamente.");
      setTransferModalOpen(false);
    } catch (e: any) {
      setTransferError(e?.message || "No se pudo iniciar la transferencia.");
    } finally {
      setTransferring(false);
    }
  }

  async function handleSelectAssetForNewAssignment(asset: AssetRow) {
    const assetCode = pickAssetCodeFromPicker(asset);
    if (!assetCode) {
      setCreateError("No se pudo determinar el código del equipo.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    try {
      const payload = {
        assetCode,
        collaboratorName: header.collaboratorName,
        collaboratorEmail: header.collaboratorEmail || null,
        hotelLabel: header.hotel !== "—" ? header.hotel : null,
        department: header.department !== "—" ? header.department : null,
        teamName: header.teamName || null,
      };

      const res = await fetch("/api/assignments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) throw new Error(await res.text());
      setPickerOpen(false);
      await load();
    } catch (e: any) {
      setCreateError(e?.message ?? "No se pudo crear la asignación.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-amber-600" />
            Resguardo del Colaborador
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Equipos asignados al colaborador (sin número).
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/equipo/assignments/manual/control"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al control
          </Link>
          <button
            onClick={load}
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
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Información del Colaborador
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Colaborador</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {header.collaboratorName}
                    </p>
                    {header.collaboratorEmail && (
                      <div className="flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <p className="text-xs text-slate-500">{header.collaboratorEmail}</p>
                      </div>
                    )}
                    {header.teamName && (
                      <div className="mt-2 text-xs text-slate-600">
                        <span className="font-medium">Equipo:</span> {header.teamName}
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
                    <p className="text-sm text-slate-800">{header.hotel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Departamento</p>
                    <p className="text-sm text-slate-800">{header.department}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Estado</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${stats.hasAssigned
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {stats.hasAssigned ? "Con equipos" : "Sin equipos"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                  <Laptop className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Total equipos:</span>
                  <span className="text-sm font-bold text-slate-800">{stats.total}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-emerald-700">Asignados:</span>
                  <span className="text-sm font-bold text-emerald-800">{stats.assigned}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                  <Laptop className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Devueltos:</span>
                  <span className="text-sm font-bold text-slate-800">{stats.returned}</span>
                </div>

                {!printMode && (
                  <div className="ml-auto flex gap-3 print:hidden">
                    {stats.hasAssigned && (
                      <button
                        onClick={openTransferModal}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        Transferir Equipos
                      </button>
                    )}
                    <button
                      onClick={() => setPickerOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
                    >
                      <Plus className="w-4 h-4" />
                      Nueva Asignación
                    </button>
                  </div>
                )}
              </div>

              {createError && (
                <div className="mt-3 text-sm text-red-600">{createError}</div>
              )}
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
                          No hay equipos en este resguardo.
                        </p>
                      </td>
                    </tr>
                  )}

                  {items.map((row) => {
                    const st = safeText(row.status).toUpperCase();
                    const isReturned = st === "DEVUELTO";
                    const isEditing = editingId === String(row.id);

                    return (
                      <tr key={String(row.id)} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-800">{pickEquipment(row)}</div>
                          {row.notes && (
                            <div className="text-xs text-slate-500 mt-1">
                              <span className="font-medium">Notas:</span> {row.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 font-mono text-slate-700">
                          {pickSerial(row)}
                        </td>
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <select
                              value={editPlatformName}
                              onChange={(e) => setEditPlatformName(e.target.value)}
                              disabled={platformsLoading}
                              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                            >
                              <option value="">Sin plataforma</option>
                              {platforms.map((p) => (
                                <option key={String(p.id)} value={p.name}>{p.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-600">
                              {safeText(row.platformName) || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${st === "ASIGNADO"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {st === "ASIGNADO" ? "Asignado" : "Devuelto"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">
                          <div>
                            <span className="font-medium">Asignado:</span>{" "}
                            {formatDateTime(row.assignedAt ?? row.createdAt)}
                          </div>
                          {row.returnedAt && (
                            <div className="mt-1">
                              <span className="font-medium">Devuelto:</span>{" "}
                              {formatDateTime(row.returnedAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right print:hidden">
                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveEdit(row)}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => beginEdit(row)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Editar
                              </button>

                              {!isReturned && (
                                <button
                                  onClick={() => markReturned(row)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  Marcar devuelto
                                </button>
                              )}

                              {isReturned && (
                                <button
                                  onClick={() => removeRow(row)}
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
        onClose={() => !creating && setPickerOpen(false)}
        onSelect={handleSelectAssetForNewAssignment}
        subtitle="Selecciona un equipo disponible para asignarlo."
        actionLabel="Asignar a este colaborador"
        busy={creating}
        externalError={createError}
      />

      {/* Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white shadow-xl p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">
              Transferir Asignaciones del Colaborador
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Transfiere todas las asignaciones activas a otro hotel
            </p>

            {/* Collaborator Info */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <User className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Nombre</p>
                  <p className="text-sm font-semibold text-slate-800">{header.collaboratorName}</p>
                  {header.collaboratorEmail && (
                    <p className="text-xs text-slate-500">{header.collaboratorEmail}</p>
                  )}
                </div>
              </div>
              <div className="text-sm text-slate-600">
                <Building2 className="w-4 h-4 inline mr-1" />
                Hotel actual: <span className="font-medium">{header.hotel}</span>
              </div>
            </div>

            {/* Hotel Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Seleccionar hotel destino
              </label>
              <select
                value={selectedDestHotel || ""}
                onChange={(e) => setSelectedDestHotel(Number(e.target.value) || null)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar hotel destino</option>
                {hotels
                  .filter((h) => h.name !== header.hotel)
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Equipment Preview */}
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-700 mb-2">
                {stats.assigned} equipo(s) asignado(s) será(n) transferido(s)
              </p>
            </div>

            {transferError && (
              <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                {transferError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTransferModalOpen(false)}
                disabled={transferring}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleInitiateTransfer}
                disabled={transferring || !selectedDestHotel}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {transferring ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRightLeft className="w-4 h-4" />
                )}
                {transferring ? "Transfiriendo..." : "Confirmar Transferencia"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
