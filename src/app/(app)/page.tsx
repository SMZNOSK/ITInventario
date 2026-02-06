// src/app/(app)/page.tsx
"use client";

import { useAuth } from "@/app/providers";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Users,
  Building2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  UserCheck,
  Trash2,
  ArrowRightLeft,
  Calendar,
  ClipboardList,
  Camera,
  UserPlus,
  Wrench,
  CheckCircle2,
  FileCheck,
} from "lucide-react";

type DashboardStats = {
  inventory: {
    total: number;
    assigned: number;
    available: number;
    loaned: number;
    disposed: number;
  };
  transfers: {
    pending: number;
    active: number;
  };
  general: {
    collaborators: number;
    hotels: number;
  };
  alerts: {
    expiredLoans: number;
    soonToExpireLoans: number;
    pendingTransfers: number;
  };
  recentActivity: Array<{
    type: string;
    id: number;
    description: string;
    user: string;
    timestamp: string;
    status: string;
  }>;
};

export default function DashboardPage() {
  const { user, fetchJSON } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJSON<DashboardStats>("/api/dashboard/stats");
      setStats(data);
    } catch (err: any) {
      console.error("Error loading dashboard stats:", err);
      setError(err?.message || "No se pudieron cargar las estadísticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Hace un momento";
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)}h`;
    return `Hace ${Math.floor(diffInSeconds / 86400)}d`;
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error || "Error al cargar el dashboard"}
        </div>
      </div>
    );
  }

  // ============================================================
  // DASHBOARD DE INGENIERO
  // ============================================================
  if (user?.role === "INGENIERO") {
    const engineerQuickActions = [
      { icon: ClipboardList, label: "Nueva Asignación", href: "/equipo/assignments", color: "blue" },
      { icon: Calendar, label: "Nuevo Préstamo", href: "/equipo/loans", color: "violet" },
      { icon: ArrowRightLeft, label: "Transferir Equipo", href: "/equipo/transfers", color: "purple" },
      { icon: CheckCircle2, label: "Aceptar Transferencias", href: "/equipo/transfers/accept", color: "green" },
      { icon: Camera, label: "Capturar Inventario", href: "/inventory/capture", color: "indigo" },
    ];

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Wrench className="w-8 h-8 text-blue-600" />
              Panel de Ingeniero
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Bienvenido, {user?.name}. Gestiona asignaciones, préstamos y transferencias.
            </p>
          </div>
          <button
            onClick={loadStats}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </header>

        {/* Stats Cards - Ingeniero */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">📊 Resumen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => router.push("/equipo/assignments/control")}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Asignaciones</p>
                  <h3 className="text-3xl font-bold text-blue-900 mt-1">{stats.inventory.assigned}</h3>
                  <p className="text-xs text-blue-600 mt-1">Equipos asignados</p>
                </div>
                <div className="p-3 bg-blue-200 rounded-lg">
                  <ClipboardList className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </div>

            <div
              onClick={() => router.push("/equipo/loans/control")}
              className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl border border-violet-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-violet-700">Préstamos Activos</p>
                  <h3 className="text-3xl font-bold text-violet-900 mt-1">{stats.inventory.loaned}</h3>
                  <p className="text-xs text-violet-600 mt-1">En curso</p>
                </div>
                <div className="p-3 bg-violet-200 rounded-lg">
                  <Calendar className="w-6 h-6 text-violet-700" />
                </div>
              </div>
            </div>

            <div
              onClick={() => router.push("/equipo/transfers/accept")}
              className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl border border-amber-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700">Pendientes</p>
                  <h3 className="text-3xl font-bold text-amber-900 mt-1">{stats.transfers.pending}</h3>
                  <p className="text-xs text-amber-600 mt-1">Transferencias por aceptar</p>
                </div>
                <div className="p-3 bg-amber-200 rounded-lg">
                  <Clock className="w-6 h-6 text-amber-700" />
                </div>
              </div>
            </div>

            <div
              onClick={() => router.push("/assets")}
              className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Disponibles</p>
                  <h3 className="text-3xl font-bold text-emerald-900 mt-1">{stats.inventory.available}</h3>
                  <p className="text-xs text-emerald-600 mt-1">Equipos para asignar</p>
                </div>
                <div className="p-3 bg-emerald-200 rounded-lg">
                  <Package className="w-6 h-6 text-emerald-700" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <section className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">⚡ Acciones Rápidas</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
              {engineerQuickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => router.push(action.href)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <action.icon className={`w-5 h-5 text-${action.color}-600`} />
                  <span className="flex-1 text-left">{action.label}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </section>

          {/* Recent Activity */}
          <section className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">📝 Actividad Reciente</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stats.recentActivity.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Sin actividad reciente</p>
                ) : (
                  stats.recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${activity.type === 'transfer' ? 'bg-purple-50' : activity.type === 'assignment' ? 'bg-blue-50' : 'bg-violet-50'
                        }`}>
                        {activity.type === 'transfer' && <ArrowRightLeft className="w-4 h-4 text-purple-600" />}
                        {activity.type === 'assignment' && <ClipboardList className="w-4 h-4 text-blue-600" />}
                        {activity.type === 'loan' && <Calendar className="w-4 h-4 text-violet-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{activity.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {activity.user} • {formatRelativeTime(activity.timestamp)}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${activity.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        activity.status === 'ASIGNADO' || activity.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                        {activity.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Alerts for Engineer */}
        {(stats.alerts.expiredLoans > 0 || stats.alerts.soonToExpireLoans > 0 || stats.alerts.pendingTransfers > 0) && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">🔔 Atención Requerida</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.alerts.expiredLoans > 0 && (
                <div
                  onClick={() => router.push("/equipo/loans/control")}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="text-sm font-semibold text-red-900">Préstamos Vencidos</h3>
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-2">{stats.alerts.expiredLoans}</p>
                  <p className="text-xs text-red-700 mt-1">Requieren atención →</p>
                </div>
              )}

              {stats.alerts.soonToExpireLoans > 0 && (
                <div
                  onClick={() => router.push("/equipo/loans/control")}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-semibold text-amber-900">Por Vencer (7 días)</h3>
                  </div>
                  <p className="text-2xl font-bold text-amber-600 mt-2">{stats.alerts.soonToExpireLoans}</p>
                  <p className="text-xs text-amber-700 mt-1">Ver detalles →</p>
                </div>
              )}

              {stats.alerts.pendingTransfers > 0 && (
                <div
                  onClick={() => router.push("/equipo/transfers/accept")}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-900">Transferencias Pendientes</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mt-2">{stats.alerts.pendingTransfers}</p>
                  <p className="text-xs text-blue-700 mt-1">Aceptar ahora →</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ============================================================
  // DASHBOARD DE ADMINISTRADOR (por defecto)
  // ============================================================
  const adminQuickActions = [
    { icon: Camera, label: "Capturar Inventario", href: "/inventory/capture", color: "indigo" },
    { icon: ClipboardList, label: "Nueva Asignación", href: "/equipo/assignments", color: "blue" },
    { icon: ArrowRightLeft, label: "Transferir Equipo", href: "/equipo/transfers", color: "purple" },
    { icon: UserPlus, label: "Nuevo Colaborador", href: "/collaborators", color: "green" },
    { icon: Trash2, label: "Control de Bajas", href: "/disposals/control", color: "red" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Dashboard{user ? ` — Hola, ${user.name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Panel de control y métricas del sistema de inventario
          </p>
        </div>
        <button
          onClick={loadStats}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </header>

      {/* Stats Cards - Inventario */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">📦 Inventario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => router.push("/assets")}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-indigo-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Activos</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.inventory.total}</h3>
                <p className="text-xs text-emerald-600 mt-1">
                  {stats.inventory.available} disponibles
                </p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Package className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => router.push("/equipo/assignments/control")}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-emerald-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Asignados</p>
                <h3 className="text-3xl font-bold text-emerald-600 mt-1">{stats.inventory.assigned}</h3>
                <p className="text-xs text-slate-500 mt-1">A colaboradores</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <UserCheck className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => router.push("/equipo/loans/control")}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-violet-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">En Préstamo</p>
                <h3 className="text-3xl font-bold text-violet-600 mt-1">{stats.inventory.loaned}</h3>
                <p className="text-xs text-slate-500 mt-1">Activos</p>
              </div>
              <div className="p-3 bg-violet-50 rounded-lg">
                <Calendar className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => router.push("/disposals/control")}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-red-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Dados de Baja</p>
                <h3 className="text-3xl font-bold text-red-600 mt-1">{stats.inventory.disposed}</h3>
                <p className="text-xs text-slate-500 mt-1">Eliminados</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Cards - General */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          onClick={() => router.push("/equipo/transfers/accept")}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-amber-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Transferencias Pendientes</p>
              <h3 className="text-3xl font-bold text-amber-600 mt-1">{stats.transfers.pending}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          {stats.transfers.pending > 0 && (
            <p className="mt-3 text-xs text-center text-amber-700 font-medium">
              Ver transferencias →
            </p>
          )}
        </div>

        <div
          onClick={() => router.push("/equipo/transfers/history")}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Completadas</p>
              <h3 className="text-3xl font-bold text-blue-600 mt-1">{stats.transfers.active}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <ArrowRightLeft className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div
          onClick={() => router.push("/collaborators")}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-slate-400"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Colaboradores</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.general.collaborators}</h3>
            </div>
            <div className="p-3 bg-slate-100 rounded-lg">
              <Users className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>

        <div
          onClick={() => router.push("/admin/hotels")}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer hover:border-slate-400"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Hoteles Activos</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.general.hotels}</h3>
            </div>
            <div className="p-3 bg-slate-100 rounded-lg">
              <Building2 className="w-6 h-6 text-slate-600" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <section className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">⚡ Acciones Rápidas</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
            {adminQuickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => router.push(action.href)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <action.icon className={`w-5 h-5 text-${action.color}-600`} />
                <span className="flex-1 text-left">{action.label}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">📝 Actividad Reciente</h2>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Sin actividad reciente</p>
              ) : (
                stats.recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${activity.type === 'transfer' ? 'bg-purple-50' : activity.type === 'assignment' ? 'bg-blue-50' : 'bg-violet-50'
                      }`}>
                      {activity.type === 'transfer' && <ArrowRightLeft className="w-4 h-4 text-purple-600" />}
                      {activity.type === 'assignment' && <ClipboardList className="w-4 h-4 text-blue-600" />}
                      {activity.type === 'loan' && <Calendar className="w-4 h-4 text-violet-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{activity.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activity.user} • {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${activity.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                      activity.status === 'ASIGNADO' || activity.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                      {activity.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Alerts */}
      {(stats.alerts.expiredLoans > 0 || stats.alerts.soonToExpireLoans > 0 || stats.alerts.pendingTransfers > 0) && (
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">🔔 Alertas y Pendientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.alerts.expiredLoans > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <h3 className="text-sm font-semibold text-red-900">Préstamos Vencidos</h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600 mt-2">{stats.alerts.expiredLoans}</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/equipo/loans/control")}
                  className="mt-3 text-xs text-red-700 hover:text-red-800 font-medium"
                >
                  Ver detalles →
                </button>
              </div>
            )}

            {stats.alerts.soonToExpireLoans > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <h3 className="text-sm font-semibold text-amber-900">Por Vencer (7 días)</h3>
                    </div>
                    <p className="text-2xl font-bold text-amber-600 mt-2">{stats.alerts.soonToExpireLoans}</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/equipo/loans/control")}
                  className="mt-3 text-xs text-amber-700 hover:text-amber-800 font-medium"
                >
                  Ver detalles →
                </button>
              </div>
            )}

            {stats.alerts.pendingTransfers > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-blue-900">Transfer. Pendientes</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-2">{stats.alerts.pendingTransfers}</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/equipo/transfers/accept")}
                  className="mt-3 text-xs text-blue-700 hover:text-blue-800 font-medium"
                >
                  Ver detalles →
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
