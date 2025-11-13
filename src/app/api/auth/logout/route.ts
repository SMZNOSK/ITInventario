// src/app/api/auth/logout/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { withError } from "@/server/utils/withError";

export const POST = withError(async () => {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("token"); // elimina cookie httpOnly
  return res;
});
