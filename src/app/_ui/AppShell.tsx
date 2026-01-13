"use client";

import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { useAuth } from "@/app/providers/AuthProvider";

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header - full width */}
      <header className="sticky top-0 z-10 border-b bg-white/70 backdrop-blur">
        <div className="flex items-center justify-between py-3 px-6">
          <div className="text-lg font-semibold">Inventario TI</div>
          {user && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">
                {user.name} <span className="text-gray-400">({user.role})</span>
              </span>
              <button className="text-red-600 hover:underline" onClick={logout}>
                Salir
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main layout - sidebar fixed left, content flexible */}
      <div className="flex">
        {/* Sidebar - fixed width, aligned to left */}
        <Sidebar />

        {/* Main content */}
        <main className="min-h-[calc(100vh-57px)] flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
