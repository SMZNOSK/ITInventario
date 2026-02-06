// src/app/(app)/equipo/loans/[id]/edit/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { ArrowLeft, Save } from "lucide-react";

type LoanDetail = {
  id: number;
  collaboratorId: string;
  collaboratorName: string | null;
  collaboratorEmail: string | null;
  departmentName: string | null;
  address: string | null;
  teamName: string;
  platformId: number | null;
  platformName: string | null;
  comments: string | null;
  startDate: string; // ISO
  endDate: string; // ISO
  totalAssets: number;
};

type PlatformOption = {
  id: number;
  name: string;
};

type LoanUpdatePayload = {
  teamName?: string;
  platformId?: number | null;
  comments?: string | null;
  startDate?: string; // yyyy-mm-dd
  endDate?: string; // yyyy-mm-dd
};

function isoToInputDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function LoanEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { fetchJSON } = useAuth();

  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [platforms, setPlatforms] = useState<PlatformOption[]>([]);

  const [teamName, setTeamName] = useState("");
  const [platformId, setPlatformId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comments, setComments] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Cargar préstamo + plataformas
  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        // 1) Detalle del préstamo
        const loanData = (await fetchJSON(`/api/loans/${id}`)) as LoanDetail;
        setLoan(loanData);

        // Prefill formulario
        setTeamName(loanData.teamName ?? "");
        setPlatformId(loanData.platformId != null ? loanData.platformId : null);
        setStartDate(isoToInputDate(loanData.startDate));
        setEndDate(isoToInputDate(loanData.endDate));
        setComments(loanData.comments ?? "");

        // 2) Plataformas activas
        const platformsData = (await fetchJSON(
          "/api/catalog/platforms?onlyActive=1",
        )) as { items: PlatformOption[] };
        setPlatforms(platformsData.items ?? []);
      } catch (err: any) {
        console.error("Error al cargar préstamo para edición", err);
        setError(err?.message || "No se pudo cargar la información del préstamo.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, fetchJSON]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: LoanUpdatePayload = {
        teamName: teamName.trim() || loan.teamName,
        platformId,
        comments: comments.trim() || null,
        startDate: startDate || isoToInputDate(loan.startDate),
        endDate: endDate || isoToInputDate(loan.endDate),
      };

      await fetchJSON(`/api/loans/${loan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setSuccess("Préstamo actualizado correctamente.");

      // refresca para evitar UI “vieja” si hay cache en layout
      router.refresh();

      setTimeout(() => {
        router.push(`/equipo/loans/${loan.id}`);
      }, 800);
    } catch (err: any) {
      console.error("Error al actualizar préstamo", err);
      setError(err?.message || "No se pudo actualizar el préstamo. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <p className="text-sm font-medium text-red-600">
        ID de préstamo inválido en la URL.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {loan
                ? `Editar préstamo de ${loan.collaboratorName || loan.collaboratorId}`
                : "Editar préstamo"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Ajusta la información del préstamo y guarda los cambios.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(loan ? `/equipo/loans/${loan.id}` : "/equipo/loans")
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al detalle
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <strong className="font-semibold">Error:</strong> {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <strong className="font-semibold">Éxito:</strong> {success}
        </div>
      )}

      {/* Formulario */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Información del Préstamo</h2>
        </div>
        <div className="p-6">
          {loading || !loan ? (
            <p className="text-sm text-slate-500">Cargando información del préstamo...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datos no editables del colaborador */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Información del Colaborador</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase text-slate-500">
                      Número de colaborador
                    </label>
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-800 border border-slate-200">
                      {loan.collaboratorId}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase text-slate-500">Nombre</label>
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-800 border border-slate-200">
                      {loan.collaboratorName || "—"}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase text-slate-500">Correo</label>
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-800 border border-slate-200">
                      {loan.collaboratorEmail || "—"}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase text-slate-500">
                      Gerencia / departamento
                    </label>
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-800 border border-slate-200">
                      {loan.departmentName || "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Campos editables */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Datos del Préstamo</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="teamName"
                      className="text-xs font-medium uppercase text-slate-500"
                    >
                      Nombre del equipo
                    </label>
                    <input
                      id="teamName"
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value.toUpperCase())}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="platformId"
                      className="text-xs font-medium uppercase text-slate-500"
                    >
                      Plataforma
                    </label>
                    <select
                      id="platformId"
                      value={platformId ?? ""}
                      onChange={(e) =>
                        setPlatformId(e.target.value ? Number.parseInt(e.target.value, 10) : null)
                      }
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                    >
                      <option value="">Sin plataforma</option>
                      {platforms.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="startDate"
                      className="text-xs font-medium uppercase text-slate-500"
                    >
                      Fecha préstamo
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="endDate"
                      className="text-xs font-medium uppercase text-slate-500"
                    >
                      Fecha devolución
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="comments" className="text-xs font-medium uppercase text-slate-500">
                  Descripción / comentarios
                </label>
                <textarea
                  id="comments"
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-colors resize-none"
                  placeholder="Describe brevemente el motivo del préstamo o notas importantes."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => router.push(loan ? `/equipo/loans/${loan.id}` : "/equipo/loans")}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
