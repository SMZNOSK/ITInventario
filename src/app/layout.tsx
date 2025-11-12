// src/app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/app/providers";

const BASE_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/assets", label: "Activos", roles: ["ADMIN", "INGENIERO"] as const },
  { href: "/assignments", label: "Asignaciones", roles: ["ADMIN", "INGENIERO"] as const },
  { href: "/disposals", label: "Bajas", roles: ["ADMIN", "INGENIERO"] as const },
  { href: "/collaborators", label: "Colaboradores", roles: ["ADMIN"] as const },
];

const CATALOG_ITEMS = [
  { href: "/catalog/types", label: "Tipos" },
  { href: "/catalog/brands", label: "Marcas" },
  { href: "/catalog/models", label: "Modelos" },
  { href: "/catalog/providers", label: "Proveedores" },
];

const ADMIN_ITEMS = [
  { href: "/admin/hotels", label: "Hoteles" },
  { href: "/admin/users", label: "Usuarios" },
];

function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between py-3 px-4">
        <div className="text-lg font-semibold">Inventario TI</div>
        {user ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">
              {user.name} <span className="text-gray-400">({user.role})</span>
            </span>
            <button
              className="text-red-600 hover:underline"
              onClick={logout}
              type="button"
            >
              Salir
            </button>
          </div>
        ) : (
          <Link href="/login" className="text-sm text-slate-700 hover:underline">
            Iniciar sesión
          </Link>
        )}
      </div>
    </header>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const base = BASE_ITEMS.filter((it) =>
    !it.roles ? true : (user ? (it.roles as readonly string[]).includes(user.role) : false)
  );

  const showAdmin = user?.role === "ADMIN";

  return (
    <aside className="w-60 shrink-0 border-r bg-white/60 backdrop-blur">
      <div className="p-4">
        <div className="mb-4 text-xs font-semibold uppercase text-gray-500">Inventario</div>
        <nav className="space-y-1">
          {base.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2 text-sm ${
                  active ? "bg-slate-700 text-white" : "text-slate-800 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="my-6 h-px bg-gray-200" />

        <div className="mb-4 text-xs font-semibold uppercase text-gray-500">Catálogos</div>
        <nav className="space-y-1">
          {CATALOG_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2 text-sm ${
                  active ? "bg-slate-700 text-white" : "text-slate-800 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {showAdmin && (
          <>
            <div className="my-6 h-px bg-gray-200" />
            <div className="mb-4 text-xs font-semibold uppercase text-gray-500">Administración</div>
            <nav className="space-y-1">
              {ADMIN_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded px-3 py-2 text-sm ${
                      active ? "bg-slate-700 text-white" : "text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>
    </aside>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 text-slate-900">
        <AuthProvider>
          <Header />
          <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
            <Sidebar />
            <main className="min-h-[70vh] flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
