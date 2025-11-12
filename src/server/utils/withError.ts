// src/server/utils/withError.ts
import "server-only";
import { NextResponse } from "next/server";

/** Error HTTP simple (como en Express) */
export class HttpError extends Error {
  status: number;
  expose: boolean;
  constructor(status: number, message = "Error", expose = status < 500) {
    super(message);
    this.status = status;
    this.expose = expose;
  }
}

/** Helpers para lanzar errores específicos */
export const http = {
  badRequest: (msg = "Bad Request") => new HttpError(400, msg),
  unauthorized: (msg = "Unauthorized") => new HttpError(401, msg),
  forbidden: (msg = "Forbidden") => new HttpError(403, msg),
  notFound: (msg = "Not Found") => new HttpError(404, msg),
  conflict: (msg = "Conflict") => new HttpError(409, msg),
  teapot: (msg = "I'm a teapot") => new HttpError(418, msg),
  serverError: (msg = "Internal Server Error") => new HttpError(500, msg, false),
};

/**
 * Envuelve un handler de Next (GET/POST/PUT...) y captura errores,
 * devolviendo JSON { error } con el status apropiado.
 *
 * Uso:
 *   export const GET = withError(async (req, ctx) => { ... return NextResponse.json(...); });
 */
export function withError<
  H extends (req: Request, ctx: any) => Promise<Response> | Response
>(handler: H) {
  return async (req: Request, ctx: any): Promise<Response> => {
    try {
      const res = await handler(req, ctx);
      return res;
    } catch (err: any) {
      // Zod (si usas zod sin importarlo aquí)
      if (err?.name === "ZodError") {
        const details = typeof err.flatten === "function" ? err.flatten() : undefined;
        return NextResponse.json(
          { error: "Invalid input", ...(details ? { details } : {}) },
          { status: 400 }
        );
      }

      // HttpError propio
      if (err instanceof HttpError) {
        if (err.status >= 500) console.error("[ERR]", err);
        return NextResponse.json(
          { error: err.expose ? err.message : "Internal Server Error" },
          { status: err.status }
        );
      }

      // Otros errores
      console.error("[ERR]", err);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
