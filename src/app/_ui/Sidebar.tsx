"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

function Item({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));
  return (
    <Link
      href={href}
      className={`block rounded-xl px-3 py-2 text-sm font-medium transition
        ${isActive ? "bg-black text-white shadow-sm" : "text-gray-700 hover:bg-gray-100"}`}
    >
      {children}
    </Link>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isIng   = user?.role === "INGENIERO";
  const isAlm   = user?.role === "ALMACEN";

  return (
    <aside className="w-[240px] shrink-0 border-r bg-white/60 backdrop-blur">
      <div className="p-4">
        <div className="mb-4 text-xs font-semibold uppercase text-gray-500">Inventario</div>
        <div className="space-y-1">
          <Item href="/">Dashboard</Item>
          {(isAdmin || isIng) && <Item href="/assets">Activos</Item>}
          {(isAdmin || isIng) && <Item href="/assignments">Asignaciones</Item>}
          {(isAdmin || isIng) && <Item href="/disposals">Bajas</Item>}
          {isAdmin && <Item href="/collaborators">Colaboradores</Item>}
        </div>

        <div className="my-6 h-px bg-gray-200" />

        <div className="mb-4 text-xs font-semibold uppercase text-gray-500">Catálogos</div>
        <div className="space-y-1">
          <Item href="/catalog/types">Tipos</Item>
          <Item href="/catalog/brands">Marcas</Item>
          <Item href="/catalog/models">Modelos</Item>
          <Item href="/catalog/providers">Proveedores</Item>
        </div>

        <div className="my-6 h-px bg-gray-200" />

        {isAdmin && (
          <>
            <div className="mb-4 text-xs font-semibold uppercase text-gray-500">Administración</div>
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
