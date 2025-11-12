"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const q = pathname ? `?from=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${q}`);
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando sesión…</div>;
  }
  if (!user) return null; // redirigiendo

  return <>{children}</>;
}
