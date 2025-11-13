// src/app/(public)/layout.tsx
import React from "react";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      {children}
    </div>
  );
}
