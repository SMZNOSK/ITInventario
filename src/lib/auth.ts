// src/lib/auth.ts
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || "dev_secret";
const secretKey = new TextEncoder().encode(SECRET);

export type TokenPayload = JWTPayload & {
  id: number;           // id de usuario en BD
  role: string;         // rol de la app
  email?: string | null;
  username?: string | null;
};

export async function signToken(payload: TokenPayload, expiresIn = "7d") {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  if (!token) throw new Error("Missing token");
  const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
  if (typeof payload.id !== "number" || typeof payload.role !== "string") {
    throw new Error("Invalid token payload");
  }
  return payload as TokenPayload;
}
