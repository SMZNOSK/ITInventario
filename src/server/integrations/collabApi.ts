// src/server/integrations/collabApi.ts
import "server-only";
import { XMLParser } from "fast-xml-parser";
import { soapPost } from "./soapClient";

/** Respuesta genérica (cruda) que devolvemos a rutas superiores */
export interface SoapRaw<T = unknown> {
  xml: string;
  json: T;
}

/** Tipo opcional para mapear bienes (cuando tengamos un Response real) */
export interface BienEmpleadoItem {
  emplid: string | null;
  propertyId: string | null;
  dtIssued: string | null;
  dtReturned: string | null;
  descrLong: string | null;
}

// Tipo expuesto para compatibilidad si luego consumes REST externo
export interface ExternalCollaborator {
  id: string;
  emplid?: string;
  name?: string;
  phone?: string;
  email?: string;
  dept?: string;
}

/* Util: parser consistente */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  ignoreDeclaration: true,
});

/* Util: assert de env con mensaje claro */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.length) {
    throw new Error(`[collabApi] Missing required env: ${name}`);
  }
  return v;
}

/** Alta de colaborador por EMPLID (SOAP) */
export async function altaColaboradorPS(emplId: string): Promise<SoapRaw> {
  if (!emplId) throw new Error("[altaColaboradorPS] emplId requerido");

  const endpoint = requireEnv("PS_ALTA_COLAB_ENDPOINT");
  const ns       = requireEnv("PS_ALTA_COLAB_NS");
  // Puede venir vacío; soapClient sólo setea SOAPAction si viene
  const action   = process.env.PS_ALTA_COLAB_ACTION;

  const body = `
    <ph:PH_ALTA_COLAB_REQ xmlns:ph="${ns}">
      <ph:MsgData>
        <ph:Transaction>
          <ph:PH_COLAB_SAP_TB class="R">
            <ph:EMPLID IsChanged="Y">${emplId}</ph:EMPLID>
          </ph:PH_COLAB_SAP_TB>
        </ph:Transaction>
      </ph:MsgData>
    </ph:PH_ALTA_COLAB_REQ>
  `.trim();

  const xml = await soapPost(endpoint, action || undefined, body);
  const json = parser.parse(xml);

  return { xml, json };
}

/** Bienes por empleado (SOAP) */
export async function bienesPorEmpleadoPS(emplId: string): Promise<SoapRaw> {
  if (!emplId) throw new Error("[bienesPorEmpleadoPS] emplId requerido");

  const endpoint = requireEnv("PS_BIENES_CIA_ENDPOINT");
  const ns       = requireEnv("PS_BIENES_CIA_NS");
  const action   = process.env.PS_BIENES_CIA_ACTION;

  const body = `
    <ph:PH_BIENES_CIA_REQ xmlns:ph="${ns}">
      <ph:MsgData>
        <ph:Transaction>
          <ph:PH_BCIA_REQ_TBL class="R">
            <ph:EMPLID IsChanged="Y">${emplId}</ph:EMPLID>
          </ph:PH_BCIA_REQ_TBL>
        </ph:Transaction>
      </ph:MsgData>
    </ph:PH_BIENES_CIA_REQ>
  `.trim();

  const xml = await soapPost(endpoint, action || undefined, body);
  const json = parser.parse(xml);

  return { xml, json };
}

/* Alias de compatibilidad si algún archivo viejo los llama */
export async function getCollaboratorById(_id: string) {
  return { ok: false as const, reason: "COLLAB_API (REST) not configured" };
}
export async function soapGetCollaboratorByEmplId(emplid: string) {
  return bienesPorEmpleadoPS(emplid);
}
