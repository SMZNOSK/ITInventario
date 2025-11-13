//src/app/(app)/page.tsx
"use client";
import { useAuth } from "@/app/providers";

export default function Page() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold">
        Dashboard{user ? ` — Hola, ${user.name}` : ""}
      </h1>
    </div>
  );
}
