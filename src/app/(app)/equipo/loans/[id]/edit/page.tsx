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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {loan
              ? `Editar préstamo de ${loan.collaboratorName || loan.collaboratorId}`
              : "Editar préstamo"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ajusta la información del préstamo y guarda los cambios.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(loan ? `/equipo/loans/${loan.id}` : "/equipo/loans")
          }
          className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al detalle
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {success}
        </div>
      )}

      {/* Formulario */}
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        {loading || !loan ? (
          <p className="text-sm text-slate-500">Cargando información del préstamo...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Datos no editables del colaborador */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Número de colaborador
                </p>
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {loan.collaboratorId}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-slate-500">Nombre</p>
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {loan.collaboratorName || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-slate-500">Correo</p>
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {loan.collaboratorEmail || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Gerencia / departamento
                </p>
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {loan.departmentName || "—"}
                </p>
              </div>
            </div>

            {/* Campos editables */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="teamName"
                  className="text-xs font-semibold uppercase text-slate-500"
                >
                  Nombre del equipo
                </label>
                <input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value.toUpperCase())}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#254D6E] focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="platformId"
                  className="text-xs font-semibold uppercase text-slate-500"
                >
                  Plataforma
                </label>
                <select
                  id="platformId"
                  value={platformId ?? ""}
                  onChange={(e) =>
                    setPlatformId(e.target.value ? Number.parseInt(e.target.value, 10) : null)
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-[#254D6E] focus:bg-white focus:outline-none"
                >
                  <option value="">Sin plataforma</option>
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="startDate"
                  className="text-xs font-semibold uppercase text-slate-500"
                >
                  Fecha préstamo
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-[#254D6E] focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="endDate"
                  className="text-xs font-semibold uppercase text-slate-500"
                >
                  Fecha devolución
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:border-[#254D6E] focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="comments" className="text-xs font-semibold uppercase text-slate-500">
                Descripción / comentarios
              </label>
              <textarea
                id="comments"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#254D6E] focus:bg-white focus:outline-none"
                placeholder="Describe brevemente el motivo del préstamo o notas importantes."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#254D6E] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#1d3f59] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
