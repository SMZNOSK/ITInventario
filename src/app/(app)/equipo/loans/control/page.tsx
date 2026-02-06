// src/app/(app)/equipo/loans/control/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import {
  Plus,
  Search,
  RefreshCw,
  Building2,
  ChevronDown,
  Eye,
  Edit,
  Calendar,
  Users,
  Clock,
  Package,
  Printer,
} from "lucide-react";

type LoanApiItem = {
  id: number;
  collaboratorId: string;
  hotelName: string | null;
  departmentName: string | null;
  collaboratorName: string | null;
  teamName: string | null;
  deviceName?: string | null;
  assetCodeLabel?: string | null;
  assetSerial?: string | null;
  startDate: string;
  endDate: string;
  totalAssets?: number | null;
};

type CollaboratorLoanGroup = {
  collaboratorId: string;
  collaboratorName: string | null;
  hotelName: string | null;
  departmentName: string | null;
  teamName: string | null;
  totalLoans: number;
  startDate: string;
  endDate: string;
  firstLoanId: number;
};

type StatusFilter = "all" | "active" | "expired";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExpired(endDate: string): boolean {
  return new Date(endDate) < new Date();
}

export default function LoansControlPage() {
  const router = useRouter();
  const { fetchJSON } = useAuth();

  const [allItems, setAllItems] = useState<CollaboratorLoanGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [hotelFilter, setHotelFilter] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = (await fetchJSON("/api/loans/control")) as { items: LoanApiItem[] };
      const list = (data?.items ?? []) as LoanApiItem[];

      const groupMap = new Map<string, CollaboratorLoanGroup>();

      for (const loan of list) {
        const collabId = String(loan.collaboratorId || "").trim();
        if (!collabId) continue;

        const existing = groupMap.get(collabId);
        if (existing) {
          existing.totalLoans += 1;
          if (new Date(loan.startDate) < new Date(existing.startDate)) {
            existing.startDate = loan.startDate;
          }
          if (new Date(loan.endDate) > new Date(existing.endDate)) {
            existing.endDate = loan.endDate;
          }
        } else {
          groupMap.set(collabId, {
            collaboratorId: collabId,
            collaboratorName: loan.collaboratorName?.trim() || null,
            hotelName: loan.hotelName?.trim() || null,
            departmentName: loan.departmentName?.trim() || null,
            teamName: loan.teamName?.trim() || null,
            totalLoans: 1,
            startDate: loan.startDate,
            endDate: loan.endDate,
            firstLoanId: loan.id,
          });
        }
      }

      const grouped = Array.from(groupMap.values());
      grouped.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      setAllItems(grouped);
    } catch (err: any) {
      console.error("Error al cargar control de préstamos", err);
      setError(err?.message || "No se pudo cargar la lista de préstamos.");
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, [fetchJSON]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Obtener lista única de hoteles
  const hotelOptions = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((item) => {
      if (item.hotelName) set.add(item.hotelName);
    });
    return Array.from(set).sort();
  }, [allItems]);

  // Filtrar filas
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.collaboratorName || "").toLowerCase().includes(q);
        const matchId = (item.collaboratorId || "").toLowerCase().includes(q);
        const matchTeam = (item.teamName || "").toLowerCase().includes(q);
        const matchDept = (item.departmentName || "").toLowerCase().includes(q);
        if (!matchName && !matchId && !matchTeam && !matchDept) return false;
      }

      // Filtro de estado
      if (statusFilter === "active" && isExpired(item.endDate)) return false;
      if (statusFilter === "expired" && !isExpired(item.endDate)) return false;

      // Filtro de hotel
      if (hotelFilter && item.hotelName !== hotelFilter) return false;

      return true;
    });
  }, [allItems, searchQuery, statusFilter, hotelFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = allItems.length;
    const activos = allItems.filter((i) => !isExpired(i.endDate)).length;
    const vencidos = allItems.filter((i) => isExpired(i.endDate)).length;
    return { total, activos, vencidos };
  }, [allItems]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setHotelFilter("");
  };

  const handlePrint = (item: CollaboratorLoanGroup) => {
    // Abrir PDF en nueva pestaña
    window.open(`/api/loans/${item.firstLoanId}/pdf`, '_blank');
  };

  const hasActiveFilters = searchQuery.trim() || statusFilter !== "all" || hotelFilter;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Package className="w-7 h-7 text-violet-600" />
            Control de Préstamos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Consulta y administra los préstamos de equipo por colaborador.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadAll}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button
            onClick={() => router.push("/equipo/loans")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" />
            Crear préstamo
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Total Préstamos
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
                Activos
              </p>
              <h3 className="text-2xl font-bold text-emerald-600">{stats.activos}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Vencidos
              </p>
              <h3 className="text-2xl font-bold text-amber-600">{stats.vencidos}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>
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
              placeholder="Buscar por nombre, ID, equipo o departamento..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
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
              onClick={() => setStatusFilter("active")}
              className={`px-4 py-2 rounded-md transition-all ${statusFilter === "active"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Activos
            </button>
            <button
              onClick={() => setStatusFilter("expired")}
              className={`px-4 py-2 rounded-md transition-all ${statusFilter === "expired"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
                }`}
            >
              Vencidos
            </button>
          </div>

          {/* Filtro de hotel */}
          <div className="relative">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                value={hotelFilter}
                onChange={(e) => setHotelFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 cursor-pointer"
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
            {filteredItems.length} {filteredItems.length === 1 ? "resultado" : "resultados"}
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
                <th className="px-4 py-3 text-left">Equipo</th>
                <th className="px-4 py-3 text-left">Fecha Préstamo</th>
                <th className="px-4 py-3 text-left">Fecha Devolución</th>
                <th className="px-4 py-3 text-center">Total</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
                    <p className="mt-2 text-sm text-slate-500">Cargando préstamos...</p>
                  </td>
                </tr>
              )}

              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Package className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="mt-4 text-lg font-medium text-slate-600">Sin resultados</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {hasActiveFilters
                        ? "No hay préstamos que coincidan con los filtros."
                        : "No hay préstamos registrados."}
                    </p>
                  </td>
                </tr>
              )}

              {!loading &&
                filteredItems.map((item) => {
                  const expired = isExpired(item.endDate);

                  return (
                    <tr key={item.collaboratorId} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">
                          {item.collaboratorName ?? "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          ID: {item.collaboratorId}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.hotelName ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-800">
                          {item.teamName ?? "—"}
                        </div>
                        {item.departmentName && (
                          <div className="text-xs text-slate-500">
                            {item.departmentName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(item.startDate)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(item.endDate)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {item.totalLoans}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${expired
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                            }`}
                        >
                          {expired ? "Vencido" : "Activo"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handlePrint(item)}
                            disabled={item.totalLoans === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir
                          </button>
                          <button
                            onClick={() => router.push(`/equipo/loans/${item.firstLoanId}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver
                          </button>
                          <button
                            onClick={() => router.push(`/equipo/loans/${item.firstLoanId}/edit`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Editar
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
