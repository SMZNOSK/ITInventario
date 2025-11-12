"use client";

import type { ReactNode } from "react";
import AppShell from "../_ui/AppShell";
import RequireAuth from "../_ui/RequireAuth";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
