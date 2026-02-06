// src/app/layout.tsx
import type { Metadata } from "next";
import React from "react";
import "./globals.css";

// 👇 Ojo: es default, NO named export
import AuthProvider from "./providers/AuthProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";

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
      <body className="transition-colors duration-300">
        <ThemeProvider>
          {/* Todo el árbol tiene contexto de auth */}
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
