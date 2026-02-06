// src/app/(app)/collaborators/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/providers";
import { RefreshCw, Search, Eye, Pencil, Trash2, X, Users, UserPlus, CloudDownload, CheckCircle, AlertTriangle } from "lucide-react";


type Collaborator = {
  id: string;
  name: string | null;
  employeeId?: string | null; // sigue existiendo en el tipo, pero ya no lo mostramos
  departmentName?: string | null;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
};

type DetailMode = "view" | "edit" | null;

export default function CollaboratorsPage() {
  const { fetchJSON } = useAuth();

  const [rows, setRows] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ---- Formulario de creación ----
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formJobTitle, setFormJobTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // ---- Filtros y paginación ----
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  // ---- Panel detalle/edición ----
  const [detail, setDetail] = useState<Collaborator | null>(null);
  const [detailMode, setDetailMode] = useState<DetailMode>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // ---- Sincronización PeopleSoft ----
  const [syncEmplIds, setSyncEmplIds] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    details?: string[];
  } | null>(null);
  const [psConnectionStatus, setPsConnectionStatus] = useState<"unknown" | "connected" | "error">("unknown");

  // ---- Búsqueda PeopleSoft ----
  const [psSearchId, setPsSearchId] = useState("");
  const [psSearching, setPsSearching] = useState(false);
  const [psSearchResult, setPsSearchResult] = useState<{
    found: boolean;
    source?: "local" | "peoplesoft";
    data?: Collaborator & { departmentName?: string };
    error?: string;
  } | null>(null);

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
          data: res as Collaborator & { departmentName?: string },
        });
        // Refresh list to include new collaborator if it was added from PS
        await loadCollaborators();
      }
    } catch (err: any) {
      console.error("[psSearch] Error:", err);
      setPsSearchResult({ found: false, error: err?.message || "Colaborador no encontrado." });
    } finally {
      setPsSearching(false);
    }
  }


  async function loadCollaborators() {
    setLoading(true);
    setLoadError(null);
    setCreateSuccess(null);

    try {
      const data = await fetchJSON("/api/collaborators");

      let items: Collaborator[];
      if (Array.isArray(data)) {
        items = data;
      } else if (Array.isArray(data?.items)) {
        items = data.items;
      } else {
        items = [];
      }

      setRows(items);
    } catch (err: any) {
      console.error("Error al cargar colaboradores", err);
      setLoadError(err?.message || "Error al cargar colaboradores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCollaborators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const values = [
        row.id,
        row.name ?? "",
        row.employeeId ?? "",
        row.departmentName ?? "",
        row.email ?? "",
        row.phone ?? "",
        row.jobTitle ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return values.includes(q);
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(
    startIndex,
    startIndex + pageSize,
  );

  const statusTitle = loadError
    ? "Error"
    : loading
      ? "Cargando..."
      : "Listo";
  const statusDetail = loadError
    ? loadError
    : `Resultados: ${filteredRows.length}`;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    if (!formId.trim()) {
      setCreateError("Debes indicar el ID del colaborador.");
      return;
    }
    if (!formName.trim()) {
      setCreateError("Debes indicar el nombre del colaborador.");
      return;
    }

    setCreating(true);
    try {
      await fetchJSON("/api/collaborators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: formId.trim(),
          name: formName.trim(),
          email: formEmail.trim() || null,
          phone: formPhone.trim() || null,
          jobTitle: formJobTitle.trim() || null,
        }),
      });

      setCreateSuccess("Colaborador registrado correctamente.");
      setFormId("");
      setFormName("");
      setFormEmail("");
      setFormPhone("");
      setFormJobTitle("");

      await loadCollaborators();
    } catch (err: any) {
      console.error("Error al crear colaborador", err);
      setCreateError(err?.message || "Error al crear colaborador");
    } finally {
      setCreating(false);
    }
  }

  function handleChangePageSize(value: number) {
    setPageSize(value);
    setPage(1);
  }

  function handlePrevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  function handleNextPage() {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  function openView(row: Collaborator) {
    setDetail(row);
    setDetailMode("view");
    setUpdateError(null);
    setUpdateSuccess(null);
  }

  function openEdit(row: Collaborator) {
    setDetail(row);
    setDetailMode("edit");
    setEditName(row.name ?? "");
    setEditEmail(row.email ?? "");
    setEditPhone(row.phone ?? "");
    setEditJobTitle(row.jobTitle ?? "");
    setUpdateError(null);
    setUpdateSuccess(null);
  }

  function closeDetail() {
    setDetail(null);
    setDetailMode(null);
    setUpdateError(null);
    setUpdateSuccess(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;

    setUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const payload = {
        name: editName.trim() || null,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        jobTitle: editJobTitle.trim() || null,
      };

      const updated = await fetchJSON(`/api/collaborators/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setUpdateSuccess("Colaborador actualizado.");

      const merged: Collaborator = {
        ...detail,
        ...(updated as any),
      };

      setDetail(merged);
      setRows((prev) =>
        prev.map((r) => (r.id === detail.id ? merged : r)),
      );
    } catch (err: any) {
      console.error("Error al actualizar colaborador", err);
      setUpdateError(err?.message || "Error al actualizar colaborador");
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete(row: Collaborator) {
    const name = row.name ?? row.id;
    if (
      !window.confirm(
        `¿Eliminar al colaborador "${name}"?\nEsta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    try {
      await fetchJSON(`/api/collaborators/${row.id}`, {
        method: "DELETE",
      });

      setRows((prev) => prev.filter((r) => r.id !== row.id));

      if (detail?.id === row.id) {
        closeDetail();
      }
    } catch (err: any) {
      console.error("Error al eliminar colaborador", err);
      alert(err?.message || "Error al eliminar colaborador");
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 flex items-center gap-3">
            <Users className="w-7 h-7 text-indigo-600" />
            Colaboradores
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra manualmente a los colaboradores que podrás usar en las asignaciones de equipo.
          </p>
        </div>
        <button
          type="button"
          onClick={loadCollaborators}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </header>

      {/* Filtros + estado */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-xs font-medium text-slate-500">
            Buscar (nombre, ID o correo)
          </label>
          <div className="mt-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-0 transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                placeholder="Ej. Juan Pérez o 123456"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Por página</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                value={pageSize}
                onChange={(e) =>
                  handleChangePageSize(Number(e.target.value))
                }
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-stretch justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Estado
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {statusTitle}
            </p>
            <p className="mt-1 text-xs text-slate-500">{statusDetail}</p>
          </div>
          <button
            type="button"
            onClick={loadCollaborators}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </button>
        </div>
      </div>

      {/* Búsqueda en PeopleSoft */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4 shadow-sm">
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
          Busca por número de colaborador (EMPLID). Si existe en PeopleSoft, se agregará automáticamente a tu lista local.
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
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
      </div>

      {/* Formulario de creación */}
      <form
        onSubmit={handleCreate}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-900">
          Registrar colaborador manualmente
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              ID / EMPLID
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              placeholder="Ej. 033633"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Nombre
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Nombre del colaborador"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Puesto (opcional)
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              value={formJobTitle}
              onChange={(e) => setFormJobTitle(e.target.value)}
              placeholder="Ej. Soporte técnico"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Correo (opcional)
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="correo@empresa.com"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-500">
              Teléfono (opcional)
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="999 999 9999"
            />
          </div>
        </div>

        {createError && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {createError}
          </div>
        )}
        {createSuccess && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            {createSuccess}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Guardando..." : "Guardar colaborador"}
          </button>
        </div>
      </form>

      {/* Tabla de resultados */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-slate-50">
            <tr>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-700">ID</th>
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-700">Nombre</th>
              {/* Eliminado Employee ID */}
              <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-700">Departamento</th>
              <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-slate-500"
                >
                  No hay colaboradores registrados.
                </td>
              </tr>
            )}

            {paginatedRows.map((c) => (
              <tr key={c.id} className="group transition hover:bg-indigo-50/40">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                  {c.id}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-slate-800">
                  {c.name ?? "-"}
                </td>
                {/* Celda de Employee ID eliminada */}
                <td className="px-4 py-3 text-sm text-slate-600">
                  {c.departmentName ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openView(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-100 hover:border-indigo-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100 hover:border-rose-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Paginación */}
        <div className="flex items-center justify-between gap-4 bg-slate-100 px-4 py-3 text-xs text-slate-600">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Anterior
          </button>

          <span>
            Página {currentPage} de {totalPages}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Panel detalle / edición */}
      {detail && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {detailMode === "edit"
                  ? "Editar colaborador"
                  : "Detalle del colaborador"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                ID: <span className="font-mono">{detail.id}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={closeDetail}
              className="rounded-full border border-slate-200 bg-slate-50 p-1 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {detailMode === "view" && (
            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-slate-500">Nombre</p>
                <p className="text-sm text-slate-800">
                  {detail.name ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Puesto</p>
                <p className="text-sm text-slate-800">
                  {detail.jobTitle ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Correo</p>
                <p className="text-sm text-slate-800">
                  {detail.email ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Teléfono
                </p>
                <p className="text-sm text-slate-800">
                  {detail.phone ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Departamento
                </p>
                <p className="text-sm text-slate-800">
                  {detail.departmentName ?? "-"}
                </p>
              </div>
            </div>
          )}

          {detailMode === "edit" && (
            <form
              onSubmit={handleUpdate}
              className="mt-4 space-y-4 border-t border-slate-100 pt-4"
            >
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500">
                    Nombre
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500">
                    Puesto
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500">
                    Correo
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-500">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              {updateError && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {updateError}
                </div>
              )}
              {updateSuccess && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  {updateSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDetailMode("view")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updating ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
