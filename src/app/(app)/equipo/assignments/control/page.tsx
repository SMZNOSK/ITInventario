// src/app/(app)/equipo/assignments/control/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/app/providers";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  Users,
  Building2,
  ChevronDown,
  Eye,
  Printer,
  ClipboardList,
  UserCheck,
  UserX,
  CloudDownload,
  CheckCircle,
  AlertTriangle,
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
};

type ControlRow = {
  collaboratorId: string;
  collaboratorName: string | null;
  hotelName: string | null;
  departmentName: string | null;
  totalEquipos: number;
  activos: number;
};

type StatusFilter = "all" | "ASIGNADO" | "DEVUELTO";

export default function EquipoAssignmentsControlPage() {
  const { fetchJSON } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<ControlRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [hotelFilter, setHotelFilter] = useState("");
  const [hotels, setHotels] = useState<{ id: number; name: string }[]>([]);

  // Búsqueda PeopleSoft
  const [psSearchId, setPsSearchId] = useState("");
  const [psSearching, setPsSearching] = useState(false);
  type PSSearchResult = {
    found: boolean;
    source?: "local" | "peoplesoft";
    data?: {
      id: string;
      name: string | null;
      departmentName?: string | null;
      email?: string | null;
      phone?: string | null;
      jobTitle?: string | null;
    };
    error?: string;
  };
  const [psSearchResult, setPsSearchResult] = useState<PSSearchResult | null>(null);

  async function handlePsSearch() {
    const id = psSearchId.trim();
    if (!id) {
      setPsSearchResult({ found: false, error: "Ingresa un número de colaborador." });
      return;
    }

    setPsSearching(true);
    setPsSearchResult(null);

    try {
      const res = await fetchJSON(`/api/collaborators/${encodeURIComponent(id)}`);
      if (res?.error) {
        setPsSearchResult({ found: false, error: res.error });
      } else {
        setPsSearchResult({
          found: true,
          source: res?.source || "local",
          data: res as PSSearchResult["data"],
        });
        // Si el colaborador viene de PS y no estaba en la lista, recargar asignaciones
        // para ver si ahora aparece (aunque probablemente no tenga asignaciones aún)
        await loadAssignments();
      }
    } catch (err: any) {
      console.error("[psSearch] Error:", err);
      setPsSearchResult({ found: false, error: err?.message || "Colaborador no encontrado." });
    } finally {
      setPsSearching(false);
    }
  }

  // Cargar hoteles
  useEffect(() => {
    async function loadHotels() {
      try {
        const res = await fetchJSON<{ items: { id: number; name: string }[] }>("/api/hotels/active");
        setHotels(res.items ?? []);
      } catch (e) {
        console.error("Error cargando hoteles:", e);
      }
    }
    loadHotels();
  }, [fetchJSON]);

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchJSON("/api/assignments");
      const items: AssignmentApiItem[] = data.items ?? [];

      const map = new Map<string, ControlRow>();

      for (const a of items) {
        const key = a.collaboratorId || "_sin_id_";
        const existing = map.get(key);

        if (!existing) {
          map.set(key, {
            collaboratorId: a.collaboratorId,
            collaboratorName: a.collaboratorName,
            hotelName: a.hotelName,
            departmentName: a.departmentName,
            totalEquipos: 1,
            activos: a.status === "ASIGNADO" ? 1 : 0,
          });
        } else {
          existing.totalEquipos += 1;
          if (a.status === "ASIGNADO") existing.activos += 1;

          if (!existing.hotelName && a.hotelName) {
            existing.hotelName = a.hotelName;
          }
          if (!existing.departmentName && a.departmentName) {
            existing.departmentName = a.departmentName;
          }
        }
      }

      const grouped = Array.from(map.values()).sort((a, b) => {
        const nameA = (a.collaboratorName || a.collaboratorId || "").toLowerCase();
        const nameB = (b.collaboratorName || b.collaboratorId || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setRows(grouped);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "No se pudo cargar el listado de asignaciones.");
    } finally {
      setLoading(false);
    }
  }, [fetchJSON]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Filtrar filas
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (row.collaboratorName || "").toLowerCase().includes(q);
        const matchId = (row.collaboratorId || "").toLowerCase().includes(q);
        const matchDept = (row.departmentName || "").toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDept) return false;
      }

      // Filtro de estado
      if (statusFilter === "ASIGNADO" && row.activos === 0) return false;
      if (statusFilter === "DEVUELTO" && row.activos > 0) return false;

      // Filtro de hotel
      if (hotelFilter && row.hotelName !== hotelFilter) return false;

      return true;
    });
  }, [rows, searchQuery, statusFilter, hotelFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const conEquipos = rows.filter((r) => r.activos > 0).length;
    const sinEquipos = rows.filter((r) => r.activos === 0).length;
    return { total, conEquipos, sinEquipos };
  }, [rows]);

  // Obtener lista única de hoteles de los datos
  const hotelOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.hotelName) set.add(r.hotelName);
    });
    return Array.from(set).sort();
  }, [rows]);

  const handleView = (row: ControlRow) => {
    if (!row.collaboratorId) return;
    router.push(`/equipo/assignments/${encodeURIComponent(row.collaboratorId)}`);
  };

  const handlePrint = (row: ControlRow) => {
    if (!row.collaboratorId) {
      setError("ID de colaborador no disponible");
      return;
    }

    if (row.activos === 0) {
      setError("El colaborador no tiene equipos asignados");
      return;
    }

    // Abrir PDF en nueva pestaña
    window.open(`/api/assignments/${encodeURIComponent(row.collaboratorId)}/pdf`, '_blank');
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setHotelFilter("");
  };

  const hasActiveFilters = searchQuery.trim() || statusFilter !== "all" || hotelFilter;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-indigo-600" />
            Control de Asignaciones
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta y administra los resguardos de equipo por colaborador.
          </p>
        </div>
        <button
          onClick={loadAssignments}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Colaboradores
              </p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
            </div>
            <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Con Equipos Asignados
              </p>
              <h3 className="text-2xl font-bold text-emerald-600">{stats.conEquipos}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Sin Equipos Activos
              </p>
              <h3 className="text-2xl font-bold text-slate-500">{stats.sinEquipos}</h3>
            </div>
            <div className="p-3 bg-slate-100 rounded-lg text-slate-500">
              <UserX className="w-6 h-6" />
            </div>
          </div>
        </div>
      </section>

      {/* Búsqueda en PeopleSoft */}
      <section className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CloudDownload className="h-5 w-5 text-purple-600" />
          <h2 className="text-sm font-semibold text-purple-900">
            Buscar colaborador en PeopleSoft
          </h2>
          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
            Consulta directa
          </span>
        </div>
        <p className="text-xs text-purple-700 mb-3">
          Busca por número de colaborador (EMPLID) para ver sus datos de PeopleSoft y verificar si tiene equipos asignados.
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex-1 max-w-md space-y-1">
            <label className="block text-xs font-medium text-purple-700">
              Número de colaborador
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-purple-400" />
              <input
                type="text"
                className="w-full rounded-xl border border-purple-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                placeholder="Ej. 033633 o 098075"
                value={psSearchId}
                onChange={(e) => setPsSearchId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePsSearch()}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handlePsSearch}
            disabled={psSearching}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {psSearching ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <CloudDownload className="h-4 w-4" />
                Buscar en PS
              </>
            )}
          </button>
        </div>

        {/* Resultado de búsqueda PS */}
        {psSearchResult && (
          <div className="mt-4">
            {psSearchResult.found && psSearchResult.data ? (
              <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Colaborador encontrado
                  </h3>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${psSearchResult.source === "peoplesoft"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                    }`}>
                    {psSearchResult.source === "peoplesoft" ? "📡 PeopleSoft" : "💾 BD Local"}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-4 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs">ID / EMPLID</span>
                    <p className="font-mono font-semibold text-slate-800">{psSearchResult.data.id}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Nombre</span>
                    <p className="font-semibold text-slate-800">{psSearchResult.data.name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Departamento / Puesto</span>
                    <p className="text-slate-800">{psSearchResult.data.departmentName || psSearchResult.data.jobTitle || "—"}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Email / Teléfono</span>
                    <p className="text-slate-800">{psSearchResult.data.email || psSearchResult.data.phone || "—"}</p>
                  </div>
                </div>
                {/* Link to see assignments */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => router.push(`/equipo/assignments/${encodeURIComponent(psSearchResult.data!.id)}`)}
                    className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    Ver equipos asignados a este colaborador
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{psSearchResult.error || "No se encontró el colaborador."}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Filtros */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        {/* Barra de búsqueda */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, ID o departamento..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Filtros adicionales */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Filtro de estado */}
          <div className="flex items-center rounded-lg bg-slate-100 p-1 text-xs font-medium">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-md transition-all ${statusFilter === "all"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter("ASIGNADO")}
              className={`px-4 py-2 rounded-md transition-all ${statusFilter === "ASIGNADO"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Con Equipos
            </button>
            <button
              onClick={() => setStatusFilter("DEVUELTO")}
              className={`px-4 py-2 rounded-md transition-all ${statusFilter === "DEVUELTO"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Sin Equipos
            </button>
          </div>

          {/* Filtro de hotel */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                value={hotelFilter}
                onChange={(e) => setHotelFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Todos los hoteles</option>
                {hotelOptions.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Limpiar filtros
            </button>
          )}

          <div className="ml-auto text-sm text-slate-500">
            {filteredRows.length} {filteredRows.length === 1 ? "resultado" : "resultados"}
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Tabla */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left">Colaborador</th>
                <th className="px-4 py-3 text-left">Hotel</th>
                <th className="px-4 py-3 text-left">Departamento</th>
                <th className="px-4 py-3 text-center">Total Equipos</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                    <p className="mt-2 text-sm text-slate-500">Cargando asignaciones...</p>
                  </td>
                </tr>
              )}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Users className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="mt-4 text-lg font-medium text-slate-600">Sin resultados</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {hasActiveFilters
                        ? "No hay colaboradores que coincidan con los filtros."
                        : "No hay asignaciones registradas."}
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredRows.map((row) => {
                  const hasActivos = row.activos > 0;

                  return (
                    <tr key={row.collaboratorId} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">
                          {row.collaboratorName ?? "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID: {row.collaboratorId || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {row.hotelName ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {row.departmentName ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold text-sm">
                          {row.activos}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${hasActivos
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                            }`}
                        >
                          {hasActivos ? "Asignado" : "Sin equipos"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleView(row)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                          </button>
                          <button
                            onClick={() => handlePrint(row)}
                            disabled={row.activos === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
