// src/app/(app)/layout.tsx
"use client";

import React from "react";
import RequireAuth from "../_ui/RequireAuth";
import AppShell from "../_ui/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
