// src/app/(app)/equipo/loans/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import {
  ArrowLeft,
  Edit,
  FileText,
  Plus,
  User,
  Mail,
  Building2,
  Calendar,
  Package,
  RefreshCw,
  Laptop,
  CheckCircle,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import { AssetPickerModal, type AssetRow } from "@/app/_ui/AssetPickerModal";

type LoanAssetHint = {
  assetId: number | null;
  assetSerial: string | null;
  assetTypeCode: string | null;
  assetCodeLabel: string | null;
  isReturned?: boolean;
};

type LoanDetail = {
  id: number;
  collaboratorId: string;
  collaboratorName: string | null;
  collaboratorEmail: string | null;
  departmentName: string | null;
  address: string | null;
  teamName: string;
  deviceName?: string | null;
  hotelId?: number | null;
  hotelName?: string | null;
  platformId: number | null;
  platformName: string | null;
  comments: string | null;
  startDate: string;
  endDate: string;
  totalAssets: number;
  asset?: LoanAssetHint | null;
};

function isLoanDetail(x: any): x is LoanDetail {
  return (
    x &&
    typeof x === "object" &&
    typeof x.id === "number" &&
    typeof x.collaboratorId === "string" &&
    typeof x.teamName === "string" &&
    typeof x.startDate === "string" &&
    typeof x.endDate === "string"
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function safeText(v: any): string {
  return String(v ?? "").trim();
}

function extractFromTeamName(raw: any): { codeLabel: string | null; serial: string | null } {
  const s = safeText(raw);
  if (!s) return { codeLabel: null, serial: null };

  const codeMatch = s.match(/\b([A-Za-z]{2,10}-\d{3,})\b/);
  const codeLabel = codeMatch ? codeMatch[1].toUpperCase() : null;

  const snMatch = s.match(/(?:S\/N|SN|SERIAL)\s*[:#]?\s*([A-Za-z0-9-]+)/i);
  let serial = snMatch ? snMatch[1]?.trim() : null;

  if (!serial && codeLabel) {
    const idx = s.toUpperCase().indexOf(codeLabel);
    if (idx >= 0) {
      const after = s.slice(idx + codeLabel.length);
      const tokenMatch = after.match(/([A-Za-z0-9-]{4,})/);
      if (tokenMatch?.[1]) serial = tokenMatch[1].trim();
    }
  }

  return { codeLabel, serial };
}

function isExpired(endDate: string): boolean {
  return new Date(endDate) < new Date();
}

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { fetchJSON } = useAuth();

  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [allLoans, setAllLoans] = useState<LoanDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatingLoan, setCreatingLoan] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);

  // Transfer state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [hotels, setHotels] = useState<{ id: number; name: string }[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [selectedDestHotel, setSelectedDestHotel] = useState<number | "">("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const closePicker = () => {
    if (creatingLoan) return;
    setPickerOpen(false);
    setPickerError(null);
  };

  const openNewLoan = () => {
    if (!loan) return;
    setPickerError(null);
    setPickerOpen(true);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoan(null);
    setAllLoans([]);

    try {
      const data = await fetchJSON(`/api/loans/${id}`);

      if (data && typeof data === "object" && "error" in data) {
        throw new Error(safeText((data as any).error) || "No se pudo cargar el préstamo.");
      }

      if (!isLoanDetail(data)) {
        throw new Error("Respuesta inválida del servidor.");
      }

      setLoan(data);

      try {
        const controlData = await fetchJSON("/api/loans/control");
        const allItems = (controlData?.items ?? []) as any[];

        const collaboratorLoans = allItems.filter(
          (item: any) => String(item.collaboratorId) === String(data.collaboratorId)
        );

        const mapped: LoanDetail[] = collaboratorLoans.map((item: any) => ({
          id: item.id,
          collaboratorId: item.collaboratorId,
          collaboratorName: item.collaboratorName,
          collaboratorEmail: data.collaboratorEmail,
          departmentName: item.departmentName,
          address: null,
          teamName: item.teamName,
          deviceName: item.deviceName,
          platformId: item.platformId ?? null,
          platformName: item.platformName ?? null,
          comments: null,
          startDate: item.startDate,
          endDate: item.endDate,
          totalAssets: 1,
          asset: {
            assetId: item.assetId ?? null,
            assetSerial: item.assetSerial ?? null,
            assetTypeCode: item.assetTypeCode ?? null,
            assetCodeLabel: item.assetCodeLabel ?? null,
            isReturned: item.isReturned ?? false,
          },
        }));

        setAllLoans(mapped);
      } catch (controlErr) {
        console.warn("No se pudieron cargar todos los préstamos:", controlErr);
        setAllLoans([data]);
      }
    } catch (err: any) {
      console.error("Error al cargar préstamo", err);
      setError(err?.message || "No se pudo cargar el préstamo.");
    } finally {
      setLoading(false);
    }
  }, [id, fetchJSON]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  const handleRecoverLoan = useCallback(async (loanId: number) => {
    if (recovering) return;

    setRecovering(true);
    setError(null);

    try {
      await fetchJSON(`/api/loans/${loanId}/recover`, { method: "POST" });
      await load();
    } catch (err: any) {
      console.error("Error al marcar devuelto", err);
      setError(err?.message || "No se pudo marcar como devuelto.");
    } finally {
      setRecovering(false);
    }
  }, [recovering, fetchJSON, load]);

  const handleDeleteLoan = useCallback(async (loanId: number) => {
    if (deleting) return;

    const ok = window.confirm("¿Eliminar este préstamo devuelto? Esta acción no se puede deshacer.");
    if (!ok) return;

    setDeleting(true);
    setError(null);

    try {
      await fetchJSON(`/api/loans/${loanId}`, { method: "DELETE" });
      if (String(loanId) === String(id)) {
        router.push("/equipo/loans/control");
      } else {
        await load();
      }
    } catch (err: any) {
      console.error("Error al eliminar préstamo", err);
      setError(err?.message || "No se pudo eliminar el préstamo.");
    } finally {
      setDeleting(false);
    }
  }, [deleting, fetchJSON, id, router, load]);

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
    if (stats.activos === 0) {
      setError("No hay préstamos activos para transferir.");
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

    if (!loan) return;

    if (!window.confirm(`¿Transferir todos los préstamos de ${loan.collaboratorName || loan.collaboratorId} al hotel seleccionado?`)) {
      return;
    }

    try {
      setTransferring(true);
      setTransferError(null);

      const response = await fetchJSON("/api/loans/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collaboratorId: loan.collaboratorId,
          collaboratorName: loan.collaboratorName || null,
          destHotelId: selectedDestHotel,
        }),
      });

      setTransferModalOpen(false);
      alert(response.message || "Transferencia de préstamos iniciada exitosamente.");
      router.push("/equipo/loans/control");
    } catch (e: any) {
      console.error(e);
      setTransferError(e?.message || "No se pudo iniciar la transferencia.");
    } finally {
      setTransferring(false);
    }
  };

  const handleSelectAssetForNewLoan = async (asset: AssetRow) => {
    if (!loan) return;

    const assetId = asset?.id;
    if (typeof assetId !== "number" || !Number.isFinite(assetId) || assetId <= 0) {
      setPickerError("Activo inválido.");
      return;
    }

    const assetSerial = (asset.serial ?? "").trim() || undefined;
    const assetCodeLabel = (asset.code ?? "").trim() || undefined;

    const today = new Date().toISOString().slice(0, 10);
    const endDateStr = loan.endDate ? new Date(loan.endDate).toISOString().slice(0, 10) : today;

    try {
      setCreatingLoan(true);
      setPickerError(null);
      setError(null);

      await fetchJSON("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collaboratorId: loan.collaboratorId,
          collaboratorName: loan.collaboratorName || loan.collaboratorId,
          collaboratorEmail: loan.collaboratorEmail || null,
          departmentName: loan.departmentName || null,
          hotelId: loan.hotelId || null,
          hotelName: loan.hotelName || null,
          teamName: loan.teamName || "PRESTAMO",
          assetId,
          assetSerial,
          assetCodeLabel,
          platformId: loan.platformId || null,
          startDate: today,
          endDate: endDateStr,
          comments: `Préstamo adicional agregado desde resguardo de ${loan.collaboratorName || loan.collaboratorId}`,
        }),
      });

      setPickerOpen(false);
      setPickerError(null);
      await load();
    } catch (e: any) {
      console.error(e);
      setPickerError(e?.message ?? "No se pudo crear el préstamo.");
    } finally {
      setCreatingLoan(false);
    }
  };

  const loanItems = useMemo(() => {
    if (!allLoans.length) return [];

    return allLoans.map((loanItem) => {
      const fallback = extractFromTeamName(loanItem.deviceName || loanItem.teamName);

      const type =
        safeText(loanItem.asset?.assetCodeLabel) ||
        safeText(fallback.codeLabel) ||
        safeText(loanItem.asset?.assetTypeCode) ||
        "—";

      const serial = safeText(loanItem.asset?.assetSerial) || safeText(fallback.serial) || "—";
      const isLoanReturned = loanItem.asset?.isReturned ?? false;

      // Solo mostrar plataforma para LAP y CPU
      const typeUpper = type.toUpperCase();
      const requiresPlatform = typeUpper.includes("LAP") || typeUpper.includes("CPU");

      return {
        key: `loan-item-${loanItem.id}`,
        loanId: loanItem.id,
        typeLabel: type,
        serial,
        platformName: requiresPlatform ? (loanItem.platformName || "—") : null,
        requiresPlatform,
        startDate: loanItem.startDate,
        endDate: loanItem.endDate,
        isReturned: isLoanReturned,
      };
    });
  }, [allLoans]);

  // Stats
  const stats = useMemo(() => {
    const total = allLoans.length;
    const activos = loanItems.filter((i) => !i.isReturned).length;
    const devueltos = loanItems.filter((i) => i.isReturned).length;
    return { total, activos, devueltos };
  }, [allLoans, loanItems]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Package className="w-7 h-7 text-violet-600" />
            {loan ? `Préstamo de ${loan.collaboratorName || loan.collaboratorId}` : "Detalle de préstamo"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta la información del préstamo y los equipos asociados.
          </p>
        </div>

        <button
          onClick={() => router.push("/equipo/loans/control")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al control
        </button>
      </header>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )
      }

      {/* Loading */}
      {
        loading && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
            <p className="mt-2 text-sm text-slate-500">Cargando información del préstamo...</p>
          </div>
        )
      }

      {/* Info del colaborador */}
      {
        !loading && loan && (
          <>
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-6 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Información del Colaborador
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Colaborador</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {loan.collaboratorName || "—"}
                      </p>
                      <p className="text-xs text-slate-500">ID: {loan.collaboratorId}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Correo</p>
                      <p className="text-sm text-slate-800">
                        {loan.collaboratorEmail || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Departamento</p>
                      <p className="text-sm text-slate-800">
                        {loan.departmentName || "—"}
                      </p>
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
                    <span className="text-sm text-emerald-700">Activos:</span>
                    <span className="text-sm font-bold text-emerald-800">{stats.activos}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Devueltos:</span>
                    <span className="text-sm font-bold text-slate-800">{stats.devueltos}</span>
                  </div>

                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={openTransferModal}
                      disabled={stats.activos === 0 || transferring}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Transferir Préstamos
                    </button>
                    <button
                      onClick={openNewLoan}
                      disabled={creatingLoan}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Nuevo Préstamo
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Comentarios */}
            {loan.comments && (
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">Descripción / Comentarios</h3>
                </div>
                <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-700">
                  {loan.comments}
                </div>
              </section>
            )}

            {/* Tabla de equipos */}
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Equipos Prestados
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Lista de equipos asociados a este préstamo.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="px-6 py-3 text-left font-semibold">Tipo / Código</th>
                      <th className="px-6 py-3 text-left font-semibold">Número de Serie</th>
                      <th className="px-6 py-3 text-left font-semibold">Plataforma</th>
                      <th className="px-6 py-3 text-left font-semibold">Fecha Préstamo</th>
                      <th className="px-6 py-3 text-left font-semibold">Fecha Devolución</th>
                      <th className="px-6 py-3 text-left font-semibold">Estado</th>
                      <th className="px-6 py-3 text-right font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loanItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center">
                          <Laptop className="w-12 h-12 text-slate-300 mx-auto" />
                          <p className="mt-2 text-sm text-slate-500">
                            No hay equipos registrados para este préstamo.
                          </p>
                        </td>
                      </tr>
                    )}

                    {loanItems.map((it) => (
                      <tr key={it.key} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-800">{it.typeLabel}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-slate-700">
                          {it.serial}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {it.requiresPlatform ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="font-medium">{it.platformName}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(it.startDate)}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {formatDate(it.endDate)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${it.isReturned
                              ? "bg-slate-100 text-slate-600"
                              : isExpired(it.endDate)
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                              }`}
                          >
                            {it.isReturned ? "Devuelto" : isExpired(it.endDate) ? "Vencido" : "Activo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => router.push(`/equipo/loans/${it.loanId}/edit`)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                              Editar
                            </button>

                            {!it.isReturned ? (
                              <button
                                onClick={() => handleRecoverLoan(it.loanId)}
                                disabled={recovering}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                {recovering ? "Marcando..." : "Marcar devuelto"}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteLoan(it.loanId)}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                {deleting ? "Eliminando..." : "Eliminar"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )
      }

      {
        !loading && !loan && !error && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="mt-2 text-sm text-slate-500">No se encontró información del préstamo.</p>
          </div>
        )
      }

      {/* Modal para seleccionar equipo */}
      <AssetPickerModal
        open={pickerOpen}
        onClose={closePicker}
        onSelect={(asset) => void handleSelectAssetForNewLoan(asset)}
        subtitle="Inventario disponible para préstamo"
        actionLabel={creatingLoan ? "Creando préstamo..." : "Usar"}
        busy={creatingLoan}
        externalError={pickerError}
      />

      {/* Transfer Modal */}
      {
        transferModalOpen && loan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl">
              {/* Header */}
              <div className="border-b border-slate-200 bg-gradient-to-r from-violet-50 to-indigo-50 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Transferir Préstamos del Colaborador
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Transfiere todos los préstamos activos a otro hotel
                </p>
              </div>

              {/* Body */}
              <div className="max-h-[calc(90vh-180px)] overflow-y-auto p-6 space-y-4">
                {/* Collaborator Info */}
                <div className="rounded-xl bg-violet-50 p-4 border border-violet-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-200 text-lg font-bold text-violet-800">
                      {(loan.collaboratorName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Nombre</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {loan.collaboratorName || "Sin nombre"}
                      </p>
                      <p className="text-xs text-slate-600">ID: {loan.collaboratorId}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-violet-600" />
                    <p className="text-sm text-slate-700">
                      <span className="font-medium">Hotel actual:</span> {loan.hotelName || "—"}
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
                      .filter((h) => loan.hotelName ? h.name !== loan.hotelName : true)
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Loan Preview */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Vista previa de préstamos</p>
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2 text-left">Tipo</th>
                          <th className="px-3 py-2 text-left">Serial</th>
                          <th className="px-3 py-2 text-left">Plataforma</th>
                          <th className="px-3 py-2 text-left">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loanItems
                          .filter((i) => !i.isReturned)
                          .map((item) => (
                            <tr key={item.key} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-700">{item.typeLabel}</td>
                              <td className="px-3 py-2 font-mono text-slate-600">{item.serial}</td>
                              <td className="px-3 py-2 text-slate-600">{item.platformName}</td>
                              <td className="px-3 py-2">
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                                  Activo
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                    <strong>{stats.activos}</strong> préstamo(s) activo(s) serán transferidos
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
        )
      }
    </div >
  );
}
