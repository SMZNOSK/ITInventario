// src/server/integrations/assetsApi.ts
// Server-only: úsalo solo desde Rutas API, Server Actions o server components.
// Si lo llamas desde /app/api/.../route.ts, añade export const runtime = "nodejs";

import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { soapPost } from "./soapClient";

export interface ExternalAsset {
  id: string;
  code: string;
  kind: string;
  model?: string;
  serial?: string;
  purchasedAt?: string; // ISO
  status?: string;
}

type Ok = { ok: true; data: ExternalAsset };
type Err = { ok: false; reason: string };

/* ======== ENV (Next server) ======== */
const BASE = process.env.ASSET_API_BASE || undefined;          // REST base (si existe)
const TOKEN = process.env.ASSET_API_TOKEN || undefined;        // "Bearer ..."
const TIMEOUT = Number(process.env.ASSET_API_TIMEOUT_MS ?? 10000);

// Soporte opcional API Key
const API_KEY = process.env.ASSET_API_KEY || undefined;
const API_KEY_HEADER = process.env.ASSET_API_KEY_HEADER || "X-API-Key";

// PeopleSoft SOAP
const PS_ENDPOINT = process.env.PS_BIENES_CIA_ENDPOINT || "";
const PS_NS       = process.env.PS_BIENES_CIA_NS || "";
const PS_ACTION   = process.env.PS_BIENES_CIA_ACTION || "";

/* ======== Cliente REST (si existe) ======== */
const restClient = BASE
  ? axios.create({
      baseURL: BASE,
      timeout: TIMEOUT,
      headers: {
        ...(TOKEN ? { Authorization: TOKEN } : {}),
        ...(API_KEY ? { [API_KEY_HEADER]: API_KEY } : {}),
      },
    })
  : null;

/* ======== Fallback SOAP (PeopleSoft) ======== */
async function getAssetByCodeViaPS(propertyId: string): Promise<Ok | Err> {
  if (!PS_ENDPOINT || !PS_NS) {
    return { ok: false, reason: "PS SOAP not configured" };
  }

  // En muchos entornos PS basta con PROPERTY_ID
  const body = `
    <ph:PH_BIENES_CIA_REQ xmlns:ph="${PS_NS}">
      <ph:MsgData>
        <ph:Transaction>
          <ph:PH_BCIA_REQ_TBL class="R">
            <ph:PROPERTY_ID IsChanged="Y">${propertyId}</ph:PROPERTY_ID>
          </ph:PH_BCIA_REQ_TBL>
        </ph:Transaction>
      </ph:MsgData>
    </ph:PH_BIENES_CIA_REQ>
  `;

  const xml = await soapPost(PS_ENDPOINT, PS_ACTION || undefined, body);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });
  const json = parser.parse(xml);

  // TODO: Ajusta el path real según la respuesta del PSIGW
  const item: ExternalAsset = {
    id: propertyId,
    code: propertyId,
    kind: "UNKNOWN",
    model: undefined,
    serial: propertyId,
    purchasedAt: undefined,
    status: "ALTA",
  };

  return { ok: true, data: item };
}

/* ======== Export principal ======== */
export async function getAssetByCode(code: string): Promise<Ok | Err> {
  // 1) Intenta REST si existe
  if (restClient) {
    try {
      const r = await restClient.get(`/assets/by-code/${encodeURIComponent(code)}`);
      return { ok: true, data: r.data as ExternalAsset };
    } catch (e: any) {
      const status = e?.response?.status;
      const reason = `REST error${status ? ` ${status}` : ""}: ${e?.message ?? "request failed"}`;
      return { ok: false, reason };
    }
  }

  // 2) Fallback SOAP
  try {
    return await getAssetByCodeViaPS(code);
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? "PS SOAP request failed" };
  }
}
