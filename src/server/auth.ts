// src/server/auth.ts
import "server-only";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { env } from "@/server/env";

const JWT_SECRET = env.JWT_SECRET;
const BCRYPT_ROUNDS = Number(env.BCRYPT_ROUNDS ?? 12);

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function signToken<T extends object>(payload: T, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken<T = any>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}
