// src/app/api/assignments/[id]/end/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import * as s from "@/server/modules/assignments/service";

// En Next 15, params viene como Promise
type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, { params }: Context) {
  try {
    const { id } = await params; // 👈 aquí lo resolvemos

    const assignment = await s.end(id);
    return NextResponse.json({ assignment }, { status: 200 });
  } catch (err: any) {
    console.error("[api/assignments/:id/end] Error:", err);

    const status =
      typeof err?.status === "number" && err.status >= 400 && err.status <= 599
        ? err.status
        : 500;

    const message =
      typeof err?.message === "string" && err.message.length > 0
        ? err.message
        : "Error al marcar como devuelto";

    return NextResponse.json({ error: message }, { status });
  }
}
