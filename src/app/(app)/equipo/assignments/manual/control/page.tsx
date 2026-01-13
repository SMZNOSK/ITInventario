"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Users,
  ClipboardList,
  Eye,
  Printer,
  UserCheck,
  UserX,
  Building2,
  Search,
  ChevronDown,
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
  status?: string | null;
  assignedAt?: string | null;
  returnedAt?: string | null;
  createdAt?: string | null;
};

type GroupRow = {
  key: string;
  collaboratorName: string;
  collaboratorEmail: string;
  hotel: string;
  department: string;
  total: number;
  assigned: number;
  lastAt: number;
};

function safeText(v?: string | null) {
  return (v ?? "").trim();
}

function pickHotel(a: ManualAssignmentItem): string {
  return safeText(a.hotelLabel) || safeText(a.hotelName) || safeText(a.hotel) || "—";
}

function groupKeyOf(a: ManualAssignmentItem): string {
  const name = safeText(a.collaboratorName);
  const email = safeText(a.collaboratorEmail);
  const hotel = pickHotel(a);
  const dept = safeText(a.department);
  return `${name}||${email}||${hotel}||${dept}`;
}

function formatDate(value?: string | null): string {
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

/* ========= Página ========= */

export default function ManualAssignmentsControlPage() {
  const [all, setAll] = useState<ManualAssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "ASIGNADO" | "DEVUELTO">("all");
  const [hotelFilter, setHotelFilter] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/assignments/manual", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Error HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => null);
      const list = (data?.items ?? data ?? []) as ManualAssignmentItem[];
      setAll(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setAll([]);
      setError(e?.message ?? "No se pudo cargar el control de asignaciones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const map = new Map<string, GroupRow>();

    for (const a of all) {
      const key = groupKeyOf(a);
      const name = safeText(a.collaboratorName) || "—";
      const email = safeText(a.collaboratorEmail);
      const hotel = pickHotel(a);
      const dept = safeText(a.department) || "—";
      const st = safeText(a.status).toUpperCase();
      const isAssigned = st === "ASIGNADO";
      const at = new Date(a.assignedAt ?? a.createdAt ?? 0).getTime() || 0;

      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          key,
          collaboratorName: name,
          collaboratorEmail: email,
          hotel,
          department: dept,
          total: 1,
          assigned: isAssigned ? 1 : 0,
          lastAt: at,
        });
      } else {
        prev.total += 1;
        if (isAssigned) prev.assigned += 1;
        if (at > prev.lastAt) prev.lastAt = at;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.lastAt - a.lastAt);
  }, [all]);

  // Lista de hoteles únicos
  const hotelOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.hotel && r.hotel !== "—") set.add(r.hotel);
    });
    return Array.from(set).sort();
  }, [rows]);

  // Stats
  const stats = useMemo(() => {
    const total = rows.length;
    const conEquipos = rows.filter((r) => r.assigned > 0).length;
    const sinEquipos = rows.filter((r) => r.assigned === 0).length;
    return { total, conEquipos, sinEquipos };
  }, [rows]);

  // Filtrar filas
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.collaboratorName.toLowerCase().includes(q);
        const matchEmail = r.collaboratorEmail.toLowerCase().includes(q);
        const matchDept = r.department.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDept) return false;
      }

      // Estado
      if (statusFilter === "ASIGNADO" && r.assigned === 0) return false;
      if (statusFilter === "DEVUELTO" && r.assigned > 0) return false;

      // Hotel
      if (hotelFilter && r.hotel !== hotelFilter) return false;

      return true;
    });
  }, [rows, searchQuery, statusFilter, hotelFilter]);

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
            <ClipboardList className="w-7 h-7 text-amber-600" />
            Control de Asignaciones sin Número
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Resguardos creados desde "Asignación sin número de colaborador".
          </p>
        </div>
        <button
          onClick={load}
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

      {/* Filtros */}
      <section className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, email o departamento..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>

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
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer"
              >
                <option value="">Todos los hoteles</option>
                {hotelOptions.map((h) => (
                  <option key={h} value={h}>{h}</option>
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
                    <p className="mt-2 text-sm text-slate-500">Cargando resguardos...</p>
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
                        : "No hay resguardos manuales."}
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredRows.map((r) => {
                  const status = r.assigned > 0 ? "ASIGNADO" : "DEVUELTO";
                  const keyEncoded = encodeURIComponent(r.key);

                  return (
                    <tr key={r.key} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">{r.collaboratorName}</div>
                        <div className="text-xs text-slate-500">
                          {r.collaboratorEmail ? `Email: ${r.collaboratorEmail}` : "Sin número (manual)"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{r.hotel}</td>
                      <td className="px-4 py-4 text-slate-600">{r.department}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {r.total}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status === "ASIGNADO"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {status === "ASIGNADO" ? "Asignado" : "Sin equipos"}
                          </span>
                          <div className="text-xs text-slate-500">
                            {formatDate(new Date(r.lastAt).toISOString())}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/equipo/assignments/manual/${keyEncoded}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                          </Link>
                          <Link
                            href={`/equipo/assignments/manual/${keyEncoded}?print=1`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir
                          </Link>
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
