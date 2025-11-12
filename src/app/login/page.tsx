"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/providers";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const qs = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión, manda al dashboard
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const redirectTo = qs.get("from") || "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const u = username.trim();

    const res = await login(u, password);
    setLoading(false);

    if (!res.ok) {
      setErr(res.error || "Error al iniciar sesión");
      return;
    }
    router.replace(redirectTo);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white shadow-lg rounded-xl p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold text-center">Iniciar sesión</h1>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Usuario</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring focus:ring-slate-300"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="tu.usuario"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Contraseña</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring focus:ring-slate-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        {err && <p className="text-sm text-red-600 text-center">{err}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {/* opcional demo */}
        <p className="text-xs text-gray-500 text-center mt-2">
          Usuario demo: <strong>admin</strong> / <strong>Admin#2025</strong>
        </p>
      </form>
    </div>
  );
}
