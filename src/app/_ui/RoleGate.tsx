"use client";

import { useAuth } from "@/app/providers/AuthProvider";

type AppRole = "ADMIN" | "ALMACEN" | "INGENIERO";

export default function RoleGate({
  roles,
  children,
}: {
  roles: AppRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role as AppRole)) return null;
  return <>{children}</>;
}
