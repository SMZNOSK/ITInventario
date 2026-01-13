// src/app/(app)/admin/users/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth, AppRole } from "@/app/providers";
import { Eye, EyeOff, ChevronLeft } from "lucide-react";
import Link from "next/link";

type HotelInfo = {
  hotel: { id: number; name: string };
};

type User = {
  id: number;
  username: string;
  name: string;
  role: AppRole;
  status: "ALTA" | "BAJA" | "INACTIVO";
  hotels: HotelInfo[];
  createdAt: string;
  updatedAt: string;
};

type Hotel = {
  id: number;
  name: string;
  active: boolean;
};

type FormMode = "create" | "edit";

const ROLES: { value: AppRole; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "INGENIERO", label: "Ingeniero" },
  { value: "ALMACEN", label: "Almacén" },
];

export default function AdminUsersPage() {
  const { fetchJSON } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AppRole>("INGENIERO");
  const [status, setStatus] = useState<"ALTA" | "BAJA" | "INACTIVO">("ALTA");
  const [selectedHotels, setSelectedHotels] = useState<number[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, hotelsData] = await Promise.all([
        fetchJSON<{ items: User[] }>("/api/admin/users"),
        fetchJSON<{ items: Hotel[] }>("/api/admin/hotels"),
      ]);
      setUsers(usersData.items ?? []);
      setHotels(hotelsData.items ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [fetchJSON]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetForm() {
    setFormMode("create");
    setEditingId(null);
    setUsername("");
    setName("");
    setPassword("");
    setRole("INGENIERO");
    setStatus("ALTA");
    setSelectedHotels([]);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedUsername) {
      setError("El nombre de usuario es obligatorio.");
      return;
    }
    if (!trimmedName) {
      setError("El nombre completo es obligatorio.");
      return;
    }
    if (formMode === "create" && !password) {
      setError("La contraseña es obligatoria para nuevos usuarios.");
      return;
    }

    try {
      if (formMode === "create") {
        await fetchJSON("/api/admin/users", {
          method: "POST",
          body: JSON.stringify({
            username: trimmedUsername,
            name: trimmedName,
            password,
            role,
            hotelIds: selectedHotels,
          }),
        });
        setSuccess("✅ Usuario creado exitosamente");
      } else if (formMode === "edit" && editingId != null) {
        const payload: any = {
          name: trimmedName,
          role,
          status,
          hotelIds: selectedHotels,
        };
        if (password) {
          payload.password = password;
        }

        await fetchJSON(`/api/admin/users/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        setSuccess("✅ Usuario actualizado exitosamente");
      }

      await loadData();
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al guardar");
    }
  }

  function startEdit(user: User) {
    setFormMode("edit");
    setEditingId(user.id);
    setUsername(user.username);
    setName(user.name);
    setPassword("");
    setRole(user.role);
    setStatus(user.status);
    setSelectedHotels(user.hotels.map((h) => h.hotel.id));
    setError(null);
    setSuccess(null);
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`¿Seguro que quieres eliminar al usuario "${user.name}"?`)) return;

    try {
      setError(null);
      await fetchJSON(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      setSuccess(`✅ Usuario "${user.name}" eliminado`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "Error al eliminar usuario");
    }
  }

  function toggleHotel(hotelId: number) {
    setSelectedHotels((prev) =>
      prev.includes(hotelId) ? prev.filter((id) => id !== hotelId) : [...prev, hotelId]
    );
  }

  function selectAllHotels() {
    const activeHotels = hotels.filter((h) => h.active);
    if (selectedHotels.length === activeHotels.length) {
      setSelectedHotels([]);
    } else {
      setSelectedHotels(activeHotels.map((h) => h.id));
    }
  }

  const activeHotels = hotels.filter((h) => h.active);
  const allSelected = activeHotels.length > 0 && selectedHotels.length === activeHotels.length;

  function getRoleBadgeColor(r: AppRole) {
    switch (r) {
      case "ADMIN":
        return "bg-purple-100 text-purple-800";
      case "INGENIERO":
        return "bg-blue-100 text-blue-800";
      case "ALMACEN":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function getStatusBadgeColor(s: string) {
    switch (s) {
      case "ALTA":
        return "bg-green-100 text-green-800";
      case "BAJA":
        return "bg-red-100 text-red-800";
      case "INACTIVO":
        return "bg-gray-200 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">
          {formMode === "create" ? "Crear Nuevo Usuario" : "Editar Usuario"}
        </h1>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al Control
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Formulario de creación/edición */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campos principales - Fila horizontal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Usuario <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej. jperez"
              disabled={formMode === "edit"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan Pérez García"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={formMode === "create" ? "Contraseña" : "Nueva contraseña (opcional)"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Tipo/Rol */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
            >
              <option value="" disabled>
                -- Seleccionar Rol --
              </option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {formMode === "edit" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="ALTA">Alta (Activo)</option>
                <option value="BAJA">Baja</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </div>
          )}
        </div>

        {/* Hoteles Asignados */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">
              Hoteles Asignados <span className="text-red-500">*</span>
            </h3>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={selectAllHotels}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Seleccionar Todos
            </label>
          </div>

          {activeHotels.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              No hay hoteles activos disponibles. Activa hoteles en la sección de Hoteles.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {activeHotels.map((hotel) => (
                <label
                  key={hotel.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                    ${selectedHotels.includes(hotel.id)
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedHotels.includes(hotel.id)}
                    onChange={() => toggleHotel(hotel.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700 truncate">{hotel.name}</span>
                </label>
              ))}
            </div>
          )}

          {selectedHotels.length > 0 && (
            <p className="text-xs text-slate-500 mt-3">
              {selectedHotels.length} hotel(es) seleccionado(s)
            </p>
          )}
        </div>

        {/* Botones */}
        <div className="flex justify-center gap-3 pt-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center px-8 py-2.5 text-sm font-medium rounded-lg bg-slate-700 text-white hover:bg-slate-800 transition-colors min-w-[140px]"
          >
            {formMode === "create" ? "Guardar" : "Actualizar"}
          </button>

          {formMode === "edit" && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Separador */}
      <hr className="my-8 border-slate-200" />

      {/* Tabla de usuarios existentes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Usuarios Registrados</h2>
          {loading && <span className="text-xs text-slate-500">Cargando...</span>}
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Hoteles
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}

              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-600">{u.id}</td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-800">{u.username}</td>
                  <td className="px-4 py-3 text-sm text-slate-800">{u.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(
                        u.role
                      )}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(
                        u.status
                      )}`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.hotels.length === 0 ? (
                      <span className="text-slate-400 text-xs italic">Sin hoteles</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.hotels.slice(0, 2).map((h) => (
                          <span
                            key={h.hotel.id}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                          >
                            {h.hotel.name}
                          </span>
                        ))}
                        {u.hotels.length > 2 && (
                          <span className="text-xs text-slate-500">+{u.hotels.length - 2} más</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 space-x-3">
                    <button
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      onClick={() => startEdit(u)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-sm text-red-600 hover:text-red-800 hover:underline font-medium"
                      onClick={() => handleDelete(u)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
