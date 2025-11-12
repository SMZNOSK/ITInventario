"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { path: "/", label: "Dashboard" },
  { path: "/collaborators", label: "Colaboradores" },
  { path: "/assets", label: "Activos" },
  { path: "/assignments", label: "Asignaciones" },
  { path: "/disposals", label: "Bajas" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="w-60 bg-slate-900 text-slate-100 p-4">
        <h1 className="text-lg font-semibold mb-6">Inventario TI</h1>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`block rounded px-3 py-2 text-sm ${
                  active ? "bg-slate-700" : "hover:bg-slate-800/70"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
