// src/app/_ui/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers";

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const cleanPath = pathname?.split("?")[0] ?? "";

  // Activo SOLO si la ruta coincide exactamente (ignorando querystring)
  const isActive = cleanPath === href;

  return (
    <Link
      href={href}
      className={`block rounded-xl px-3 py-2 text-sm font-medium transition ${isActive
        ? "bg-black text-white shadow-sm"
        : "text-gray-700 hover:bg-gray-100"
        }`}
    >
      {children}
    </Link>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isIng = user?.role === "INGENIERO";
  const isAlm = user?.role === "ALMACEN";

  const canInventory = isAdmin || isIng || isAlm;
  const canTeam = isAdmin || isIng || isAlm;

  return (
    <aside className="w-[240px] shrink-0 border-r bg-white/60 backdrop-blur">
      <div className="p-4">
        {/* ===== Inventario ===== */}
        <div className="mb-4 text-xs font-semibold uppercase text-gray-500">
          Inventario
        </div>
        <div className="space-y-1">
          <Item href="/">Dashboard</Item>
          {canInventory && <Item href="/assets">Activos</Item>}
          {canInventory && (
            <Item href="/inventory/capture">Captura de inventario</Item>
          )}
          {canInventory && <Item href="/disposals">Bajas</Item>}
          {canInventory && <Item href="/disposals/control">Control de Bajas</Item>}
          {isAdmin && <Item href="/collaborators">Colaboradores</Item>}
          {canInventory && <Item href="/equipo/transfers">Transferir Equipo</Item>}
          {canInventory && <Item href="/equipo/transfers/accept">Aceptar Transferencias</Item>}
          {isAdmin && <Item href="/equipo/transfers/history">Historial de Transferencias</Item>}
        </div>

        <div className="my-6 h-px bg-gray-200" />

        {/* ===== Equipo ===== */}
        {canTeam && (
          <>
            <div className="mb-4 text-xs font-semibold uppercase text-gray-500">
              Equipo
            </div>
            <div className="space-y-1">
              {/* Asignación principal (con número / PeopleSoft) */}
              <Item href="/assignments">Asignaciones</Item>
              <Item href="/equipo/assignments/control">Control de Asignaciones</Item>
              <Item href="/equipo/loans">Préstamos</Item>
              <Item href="/equipo/loans/control">Control de Préstamos</Item>
              <Item href="/equipo/assignments/manual">Asignación sin número</Item>
              <Item href="/equipo/assignments/manual/control">Control asignaciones sin número</Item>
              <Item href="/equipo/platforms">Plataformas</Item>
            </div>

            <div className="my-6 h-px bg-gray-200" />
          </>
        )}

        {/* ===== Catálogos ===== */}
        <div className="mb-4 text-xs font-semibold uppercase text-gray-500">
          Catálogos
        </div>
        <div className="space-y-1">
          <Item href="/catalog/types">Tipos</Item>
          <Item href="/catalog/brands">Marcas</Item>
          <Item href="/catalog/models">Modelos</Item>
          <Item href="/catalog/os">Sistemas Operativos</Item>
          <Item href="/catalog/processors">Procesadores</Item>
          <Item href="/catalog/ram">Memoria RAM</Item>
          <Item href="/catalog/disks">Tipos de disco</Item>
          <Item href="/catalog/storage">Almacenamiento interno</Item>
          <Item href="/catalog/providers">Proveedores</Item>
        </div>

        <div className="my-6 h-px bg-gray-200" />

        {/* ===== Administración ===== */}
        {isAdmin && (
          <>
            <div className="mb-4 text-xs font-semibold uppercase text-gray-500">
              Administración
            </div>
            <div className="space-y-1">
              <Item href="/admin/hotels">Hoteles</Item>
              <Item href="/admin/users">Usuarios</Item>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
