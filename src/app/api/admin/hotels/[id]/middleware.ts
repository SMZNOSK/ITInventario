// middleware.ts (opcional, check superficial por cookie)
// ❗ No verifica JWT (Edge). Para verificación real en Edge usa 'jose' o valida en server actions.
import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isApi = req.nextUrl.pathname.startsWith("/api");
  if (isApi) return NextResponse.next();

  const publicRoutes = ["/login"]; // agrega más si aplica
  if (publicRoutes.includes(req.nextUrl.pathname)) return NextResponse.next();

  const hasToken = req.cookies.get("token")?.value;
  if (!hasToken) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|public).*)"],
};
