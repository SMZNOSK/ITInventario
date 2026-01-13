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

      return {
        key: `loan-item-${loanItem.id}`,
        loanId: loanItem.id,
        typeLabel: type,
        serial,
        platformName: loanItem.platformName || "—",
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

        <div className="flex gap-3">
          <button
            onClick={() => router.push("/equipo/loans/control")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al control
          </button>

          {loan && (
            <button
              onClick={() => router.push(`/equipo/loans/${loan.id}/edit`)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900"
            >
              <Edit className="w-4 h-4" />
              Modificar préstamo
            </button>
          )}
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
          <p className="mt-2 text-sm text-slate-500">Cargando información del préstamo...</p>
        </div>
      )}

      {/* Info del colaborador */}
      {!loading && loan && (
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

                <div className="ml-auto">
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
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 text-left">Tipo / Código</th>
                    <th className="px-4 py-3 text-left">Número de Serie</th>
                    <th className="px-4 py-3 text-left">Plataforma</th>
                    <th className="px-4 py-3 text-left">Fecha Préstamo</th>
                    <th className="px-4 py-3 text-left">Fecha Devolución</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
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
                    <tr key={it.key} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-800">{it.typeLabel}</span>
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-700">
                        {it.serial}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {it.platformName}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(it.startDate)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(it.endDate)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${it.isReturned
                              ? "bg-slate-100 text-slate-600"
                              : isExpired(it.endDate)
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                        >
                          {it.isReturned ? "Devuelto" : isExpired(it.endDate) ? "Vencido" : "Activo"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => router.push(`/equipo/loans/${it.loanId}/edit`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Editar
                          </button>

                          {!it.isReturned ? (
                            <button
                              onClick={() => handleRecoverLoan(it.loanId)}
                              disabled={recovering}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {recovering ? "Marcando..." : "Marcar devuelto"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeleteLoan(it.loanId)}
                              disabled={deleting}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {!loading && !loan && !error && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="mt-2 text-sm text-slate-500">No se encontró información del préstamo.</p>
        </div>
      )}

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
    </div>
  );
}
