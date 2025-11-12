// src/server/env.ts
import "server-only";
import { z } from "zod";

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(1).default("change-me-in-env"),
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // PeopleSoft / SOAP
  PS_ENABLE: z.string().optional(),
  PS_SOAP_HOST: z.string().url().optional(),
  PS_WSDL_ALTA_COLAB: z.string().url().optional(),
  PS_WSDL_BIENES_EMPL: z.string().url().optional(),
  PS_ALTA_COLAB_ENDPOINT: z.string().url().optional(),
  PS_BIENES_CIA_ENDPOINT: z.string().url().optional(),
  PS_ALTA_COLAB_NS: z.string().optional(),
  PS_BIENES_CIA_NS: z.string().optional(),
  PS_ALTA_COLAB_ACTION: z.string().optional(),
  PS_BIENES_CIA_ACTION: z.string().optional(),
  PS_SOAP_AUTH: z.enum(["basic", "none"]).default("basic"),
  PS_SOAP_USER: z.string().optional(),
  PS_SOAP_PASS: z.string().optional(),
  PS_SOAP_TIMEOUT_MS: z.coerce.number().default(15000),

  // QAS (REST de PeopleSoft)
  PS_QAS_BASE: z.string().url().optional(),
  PS_QAS_TOKEN: z.string().optional(),

  // Asset API (REST externo opcional)
  ASSET_API_BASE: z.string().url().optional(),
  ASSET_API_TOKEN: z.string().optional(),
  ASSET_API_TIMEOUT_MS: z.coerce.number().default(10000),
});

export const env = ServerEnvSchema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
