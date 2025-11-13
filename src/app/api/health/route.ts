// src/app/api/health/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env"; // si no lo usas, puedes leer process.env directamente
import { withError } from "@/server/utils/withError";

export const GET = withError(async () => {
  const out: any = {
    ok: true,
    now: new Date().toISOString(),
    env: process.env.NODE_ENV,
    uptimeSec: Math.round(process.uptime()),
    ps: {
      enabled: process.env.PS_ENABLE !== "0",
    },
    db: { ok: false },
  };

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    out.db.ok = true;
  } catch {
    out.ok = false;
    out.db.ok = false;
  }

  if (env?.PS_SOAP_TIMEOUT_MS) {
    out.ps.timeoutMs = env.PS_SOAP_TIMEOUT_MS;
  }

  return NextResponse.json(out);
});
