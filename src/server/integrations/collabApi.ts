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
  const ns = requireEnv("PS_ALTA_COLAB_NS");
  // SOAPAction debe ser "AltaColaboradores.VERSION_1" (como en SoapUI)
  const action = process.env.PS_ALTA_COLAB_ACTION || "AltaColaboradores.VERSION_1";

  // Estructura exacta que usa SoapUI (sin namespace en el body, se declara en envelope)
  const body = `
      <ph:PH_ALTA_COLAB_REQ>
         <ph:FieldTypes>
            <ph:PH_COLAB_SAP_TB class="R">
               <ph:EMPLID type="CHAR"/>
            </ph:PH_COLAB_SAP_TB>
            <ph:PSCAMA class="R">
               <ph:LANGUAGE_CD type="CHAR"/>
               <ph:AUDIT_ACTN type="CHAR"/>
               <ph:BASE_LANGUAGE_CD type="CHAR"/>
               <ph:MSG_SEQ_FLG type="CHAR"/>
               <ph:PROCESS_INSTANCE type="NUMBER"/>
               <ph:PUBLISH_RULE_ID type="CHAR"/>
               <ph:MSGNODENAME type="CHAR"/>
            </ph:PSCAMA>
         </ph:FieldTypes>
         <ph:MsgData>
            <ph:Transaction>
               <ph:PH_COLAB_SAP_TB class="R">
                  <ph:EMPLID IsChanged="Y">${emplId}</ph:EMPLID>
               </ph:PH_COLAB_SAP_TB>
               <ph:PSCAMA class="R">
                  <ph:LANGUAGE_CD IsChanged="N">N</ph:LANGUAGE_CD>
                  <ph:AUDIT_ACTN IsChanged="N">N</ph:AUDIT_ACTN>
                  <ph:BASE_LANGUAGE_CD IsChanged="N">N</ph:BASE_LANGUAGE_CD>
                  <ph:MSG_SEQ_FLG IsChanged="N">N</ph:MSG_SEQ_FLG>
                  <ph:PROCESS_INSTANCE IsChanged="N"/>
                  <ph:PUBLISH_RULE_ID IsChanged="N"/>
                  <ph:MSGNODENAME IsChanged="N"/>
               </ph:PSCAMA>
            </ph:Transaction>
         </ph:MsgData>
      </ph:PH_ALTA_COLAB_REQ>
  `.trim();

  // Use service-specific credentials
  const user = (process.env.PS_ALTA_COLAB_USER || "").replace(/^["']|["']$/g, '').trim();
  const pass = (process.env.PS_ALTA_COLAB_PASS || "").replace(/^["']|["']$/g, '').trim();

  // Pasar el namespace para que se declare en el envelope (como SoapUI)
  const xml = await soapPost(endpoint, action, body, ns, { user, pass });
  const json = parser.parse(xml);

  return { xml, json };
}

/** Consulta bienes por empleado (SOAP) - PH_BIENES_POR_EMPLEADO */
export async function bienesPorEmpleadoPS(emplId: string): Promise<SoapRaw> {
  if (!emplId) throw new Error("[bienesPorEmpleadoPS] emplId requerido");

  // Usa PS_BIENES_EMPL_* (para consulta) o fallback a PS_BIENES_CIA_* 
  const endpoint = process.env.PS_BIENES_EMPL_ENDPOINT || requireEnv("PS_BIENES_CIA_ENDPOINT");
  const ns = process.env.PS_BIENES_EMPL_NS || requireEnv("PS_BIENES_CIA_NS");
  const action = process.env.PS_BIENES_EMPL_ACTION || process.env.PS_BIENES_CIA_ACTION;

  // Estructura según WSDL PH_BIENES_EMPL (consulta)
  const body = `
    <ph:PH_BIENES_EMPL_REQ>
      <ph:FieldTypes>
        <ph:PH_BIEN_EMPL_TB class="R">
          <ph:EMPLID type="CHAR"/>
        </ph:PH_BIEN_EMPL_TB>
        <ph:PSCAMA class="R">
          <ph:LANGUAGE_CD type="CHAR"/>
          <ph:AUDIT_ACTN type="CHAR"/>
          <ph:BASE_LANGUAGE_CD type="CHAR"/>
          <ph:MSG_SEQ_FLG type="CHAR"/>
          <ph:PROCESS_INSTANCE type="NUMBER"/>
          <ph:PUBLISH_RULE_ID type="CHAR"/>
          <ph:MSGNODENAME type="CHAR"/>
        </ph:PSCAMA>
      </ph:FieldTypes>
      <ph:MsgData>
        <ph:Transaction>
          <ph:PH_BIEN_EMPL_TB class="R">
            <ph:EMPLID IsChanged="Y">${emplId}</ph:EMPLID>
          </ph:PH_BIEN_EMPL_TB>
          <ph:PSCAMA class="R">
            <ph:LANGUAGE_CD IsChanged="N">ESP</ph:LANGUAGE_CD>
            <ph:AUDIT_ACTN IsChanged="N">N</ph:AUDIT_ACTN>
            <ph:BASE_LANGUAGE_CD IsChanged="N">ESP</ph:BASE_LANGUAGE_CD>
            <ph:MSG_SEQ_FLG IsChanged="N">N</ph:MSG_SEQ_FLG>
            <ph:PROCESS_INSTANCE IsChanged="N">0</ph:PROCESS_INSTANCE>
            <ph:PUBLISH_RULE_ID IsChanged="N"></ph:PUBLISH_RULE_ID>
            <ph:MSGNODENAME IsChanged="N"></ph:MSGNODENAME>
          </ph:PSCAMA>
        </ph:Transaction>
      </ph:MsgData>
    </ph:PH_BIENES_EMPL_REQ>
  `.trim();

  // Use service-specific credentials for read operations
  const user = (process.env.PS_BIENES_EMPL_USER || "").replace(/^["']|["']$/g, '').trim();
  const pass = (process.env.PS_BIENES_EMPL_PASS || "").replace(/^["']|["']$/g, '').trim();

  const xml = await soapPost(endpoint, action || undefined, body, ns, { user, pass });
  const json = parser.parse(xml);

  return { xml, json };
}

/** 
 * Registrar asignación de bien en PeopleSoft (SOAP) - PH_BIENES_CIA_EMPLEADO
 * Este servicio es para ESCRITURA (asignar/actualizar bienes)
 * 
 * TODO: Necesita XML de ejemplo del servicio de asignación
 */
export interface RegistrarBienInput {
  emplid: string;
  propertyId: string;
  description: string;
  dtIssued: string; // Format: YYYY-MM-DD
  notes?: string;
}

export async function registrarBienPS(input: RegistrarBienInput): Promise<SoapRaw> {
  if (!input.emplid) throw new Error("[registrarBienPS] emplid requerido");
  if (!input.propertyId) throw new Error("[registrarBienPS] propertyId requerido");

  const endpoint = requireEnv("PS_BIENES_CIA_ENDPOINT");
  const ns = requireEnv("PS_BIENES_CIA_NS");
  const action = process.env.PS_BIENES_CIA_ACTION;

  // Use service-specific credentials for write operations
  const user = (process.env.PS_BIENES_CIA_USER || "").replace(/^["']|["']$/g, '').trim();
  const pass = (process.env.PS_BIENES_CIA_PASS || "").replace(/^["']|["']$/g, '').trim();

  // PROPERTY_ID max 10 chars según WSDL
  const propId = input.propertyId.substring(0, 10);

  // Estructura EXACTA del WSDL:
  // - Record: PH_BCIA_REQ_TBL (NO PH_BIENES_EM_TB)
  // - Campos: EMPLID, PROPERTY_ID, DT_ISSUED (sin DESCR2 ni DESCRLONG)
  const body = `
    <ph:PH_BIENES_CIA_REQ>
      <ph:FieldTypes>
        <ph:PH_BCIA_REQ_TBL class="R">
          <ph:EMPLID type="CHAR"/>
          <ph:PROPERTY_ID type="CHAR"/>
          <ph:DT_ISSUED type="DATE"/>
        </ph:PH_BCIA_REQ_TBL>
        <ph:PSCAMA class="R">
          <ph:LANGUAGE_CD type="CHAR"/>
          <ph:AUDIT_ACTN type="CHAR"/>
          <ph:BASE_LANGUAGE_CD type="CHAR"/>
          <ph:MSG_SEQ_FLG type="CHAR"/>
          <ph:PROCESS_INSTANCE type="NUMBER"/>
          <ph:PUBLISH_RULE_ID type="CHAR"/>
          <ph:MSGNODENAME type="CHAR"/>
        </ph:PSCAMA>
      </ph:FieldTypes>
      <ph:MsgData>
        <ph:Transaction>
          <ph:PH_BCIA_REQ_TBL class="R">
            <ph:EMPLID IsChanged="Y">${input.emplid}</ph:EMPLID>
            <ph:PROPERTY_ID IsChanged="Y">${propId}</ph:PROPERTY_ID>
            <ph:DT_ISSUED IsChanged="Y">${input.dtIssued}</ph:DT_ISSUED>
          </ph:PH_BCIA_REQ_TBL>
          <ph:PSCAMA class="R">
            <ph:LANGUAGE_CD IsChanged="N">ESP</ph:LANGUAGE_CD>
            <ph:AUDIT_ACTN IsChanged="Y">A</ph:AUDIT_ACTN>
            <ph:BASE_LANGUAGE_CD IsChanged="N">ESP</ph:BASE_LANGUAGE_CD>
            <ph:MSG_SEQ_FLG IsChanged="N">N</ph:MSG_SEQ_FLG>
            <ph:PROCESS_INSTANCE IsChanged="N">0</ph:PROCESS_INSTANCE>
            <ph:PUBLISH_RULE_ID IsChanged="N"></ph:PUBLISH_RULE_ID>
            <ph:MSGNODENAME IsChanged="N"></ph:MSGNODENAME>
          </ph:PSCAMA>
        </ph:Transaction>
      </ph:MsgData>
    </ph:PH_BIENES_CIA_REQ>
  `.trim();

  console.log("[registrarBienPS] Registrando bien en PS:", propId, "para", input.emplid);
  console.log("[registrarBienPS] Using credentials:", user);

  // Pass namespace to envelope AND service-specific credentials
  const xml = await soapPost(endpoint, action || undefined, body, ns, { user, pass });
  const json = parser.parse(xml);

  // Verificar respuesta de PeopleSoft
  const validateMatch = xml.match(/<VALIDATE[^>]*>([^<]*)<\/VALIDATE>/);
  const messageMatch = xml.match(/<MESSAGE_TEXT[^>]*>([^<]*)<\/MESSAGE_TEXT>/);
  const validate = validateMatch?.[1];
  const message = messageMatch?.[1] || '';

  console.log(`[registrarBienPS] PS Response: VALIDATE=${validate}, MESSAGE=${message}`);

  if (validate !== 'T') {
    throw new Error(`[registrarBienPS] PeopleSoft rechazó la asignación: VALIDATE=${validate} MESSAGE=${message}`);
  }

  return { xml, json };
}

/**
 * Registrar devolución de bien en PeopleSoft (SOAP)
 * 
 * IMPORTANTE: Para que funcione, el registro DEBE existir en la tabla principal de PS.
 * Los registros nuevos tardan en procesarse (batch). Si el registro aún no existe,
 * PS responderá con VALIDATE=F.
 * 
 * Estructura verificada por test A/B:
 * - AUDIT_ACTN = C (Change) — NO "A" (Add)
 * - DT_RETURNED es el único campo de datos adicional
 * - NO incluir DT_ISSUED (causa conflicto)
 */
export interface DevolverBienInput {
  emplid: string;
  propertyId: string;
  dtReturned: string; // Format: YYYY-MM-DD
}

export async function devolverBienPS(input: DevolverBienInput): Promise<SoapRaw> {
  if (!input.emplid) throw new Error("[devolverBienPS] emplid requerido");
  if (!input.propertyId) throw new Error("[devolverBienPS] propertyId requerido");

  const endpoint = requireEnv("PS_BIENES_CIA_ENDPOINT");
  const ns = requireEnv("PS_BIENES_CIA_NS");
  const action = process.env.PS_BIENES_CIA_ACTION;

  // Use service-specific credentials for write operations
  const user = (process.env.PS_BIENES_CIA_USER || "").replace(/^["']|["']$/g, '').trim();
  const pass = (process.env.PS_BIENES_CIA_PASS || "").replace(/^["']|["']$/g, '').trim();

  // PROPERTY_ID max 10 chars según WSDL
  const propId = input.propertyId.substring(0, 10);

  // Estructura correcta verificada por test A/B:
  // - Record: PH_BCIA_REQ_TBL
  // - Solo DT_RETURNED (sin DT_ISSUED)
  // - AUDIT_ACTN = C (Change, para modificar registro existente)
  const body = `
    <ph:PH_BIENES_CIA_REQ>
      <ph:FieldTypes>
        <ph:PH_BCIA_REQ_TBL class="R">
          <ph:EMPLID type="CHAR"/>
          <ph:PROPERTY_ID type="CHAR"/>
          <ph:DT_RETURNED type="DATE"/>
        </ph:PH_BCIA_REQ_TBL>
        <ph:PSCAMA class="R">
          <ph:LANGUAGE_CD type="CHAR"/>
          <ph:AUDIT_ACTN type="CHAR"/>
          <ph:BASE_LANGUAGE_CD type="CHAR"/>
          <ph:MSG_SEQ_FLG type="CHAR"/>
          <ph:PROCESS_INSTANCE type="NUMBER"/>
          <ph:PUBLISH_RULE_ID type="CHAR"/>
          <ph:MSGNODENAME type="CHAR"/>
        </ph:PSCAMA>
      </ph:FieldTypes>
      <ph:MsgData>
        <ph:Transaction>
          <ph:PH_BCIA_REQ_TBL class="R">
            <ph:EMPLID IsChanged="Y">${input.emplid}</ph:EMPLID>
            <ph:PROPERTY_ID IsChanged="Y">${propId}</ph:PROPERTY_ID>
            <ph:DT_RETURNED IsChanged="Y">${input.dtReturned}</ph:DT_RETURNED>
          </ph:PH_BCIA_REQ_TBL>
          <ph:PSCAMA class="R">
            <ph:LANGUAGE_CD IsChanged="N">ESP</ph:LANGUAGE_CD>
            <ph:AUDIT_ACTN IsChanged="Y">C</ph:AUDIT_ACTN>
            <ph:BASE_LANGUAGE_CD IsChanged="N">ESP</ph:BASE_LANGUAGE_CD>
            <ph:MSG_SEQ_FLG IsChanged="N">N</ph:MSG_SEQ_FLG>
            <ph:PROCESS_INSTANCE IsChanged="N">0</ph:PROCESS_INSTANCE>
            <ph:PUBLISH_RULE_ID IsChanged="N"></ph:PUBLISH_RULE_ID>
            <ph:MSGNODENAME IsChanged="N"></ph:MSGNODENAME>
          </ph:PSCAMA>
        </ph:Transaction>
      </ph:MsgData>
    </ph:PH_BIENES_CIA_REQ>
  `.trim();

  console.log("[devolverBienPS] Marcando devolución en PS:", propId, "para", input.emplid);
  console.log("[devolverBienPS] DT_RETURNED:", input.dtReturned, "| AUDIT_ACTN: C");
  console.log("[devolverBienPS] Using credentials:", user);

  // Pass namespace to envelope AND service-specific credentials
  const xml = await soapPost(endpoint, action || undefined, body, ns, { user, pass });
  const json = parser.parse(xml);

  // Verificar respuesta de PeopleSoft
  const validateMatch = xml.match(/<VALIDATE[^>]*>([^<]*)<\/VALIDATE>/);
  const messageMatch = xml.match(/<MESSAGE_TEXT[^>]*>([^<]*)<\/MESSAGE_TEXT>/);
  const validate = validateMatch?.[1];
  const message = messageMatch?.[1] || '';

  console.log(`[devolverBienPS] PS Response: VALIDATE=${validate}, MESSAGE=${message}`);

  if (validate !== 'T') {
    throw new Error(`[devolverBienPS] PeopleSoft rechazó la devolución: VALIDATE=${validate} MESSAGE=${message}`);
  }

  return { xml, json };
}

/* Alias de compatibilidad si algún archivo viejo los llama */
export async function getCollaboratorById(_id: string) {
  return { ok: false as const, reason: "COLLAB_API (REST) not configured" };
}
export async function soapGetCollaboratorByEmplId(emplid: string) {
  return bienesPorEmpleadoPS(emplid);
}

