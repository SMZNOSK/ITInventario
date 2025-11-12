export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getAssetByCode } from "@/server/integrations/assetsApi";

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const res = await getAssetByCode(params.code);
  if (!res.ok) return NextResponse.json({ error: res.reason }, { status: 502 });
  return NextResponse.json(res.data, { status: 200 });
}
