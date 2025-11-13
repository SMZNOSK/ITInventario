// src/app/layout.tsx
import type { Metadata } from "next";
import React from "react";
import "./globals.css";

// 👇 Ojo: es default, NO named export
import AuthProvider from "./providers/AuthProvider";

export const metadata: Metadata = {
  title: "Inventario TI",
  description: "Sistema de inventario de TI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900">
        {/* Todo el árbol tiene contexto de auth */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
