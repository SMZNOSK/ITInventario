// src/server/integrations/psParser.ts
import "server-only";

/**
 * Datos de colaborador parseados del response de PeopleSoft
 * Campos basados en WSDL PH_ALTA_COLABORADORES > PH_COLAB_ACT_TB
 */
export interface PSCollaboratorData {
    emplid: string | null;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    departmentId: string | null;
    departmentName: string | null;
    jobCode: string | null;
    jobTitle: string | null;
    email: string | null;
    phone: string | null;
    hotelCode: string | null;
    hotelName: string | null;
    location: string | null;
    hrStatus: string | null;
    costCenter: string | null;
}

/**
 * Parsea la respuesta JSON (convertida desde XML) del servicio PH_ALTA_COLABORADORES
 * La estructura viene de: soapenv:Envelope > soapenv:Body > PH_ALTA_COLAB_RESP > MsgData > Transaction > PH_COLAB_ACT_TB
 */
export function parseAltaColaboradorResponse(json: any): PSCollaboratorData | null {
    try {
        // Navegar la estructura del envelope SOAP
        const envelope = json?.["soapenv:Envelope"] || json?.["soap:Envelope"] || json;
        const body = envelope?.["soapenv:Body"] || envelope?.["soap:Body"] || envelope;

        // Intentar encontrar los datos del colaborador en diferentes estructuras posibles
        let data: any = null;

        // Path 1: Respuesta típica PH_ALTA_COLAB_RESP > MsgData > Transaction > PH_COLAB_ACT_TB
        const resp = body?.["PH_ALTA_COLAB_RESP"] || body?.["ph:PH_ALTA_COLAB_RESP"];
        if (resp) {
            data = resp?.MsgData?.Transaction?.PH_COLAB_ACT_TB;
        }

        // Path 2: Con namespace prefijo
        if (!data) {
            const keys = Object.keys(body || {});
            for (const key of keys) {
                if (key.includes("ALTA_COLAB") && key.includes("RESP")) {
                    const r = body[key];
                    data = r?.MsgData?.Transaction?.PH_COLAB_ACT_TB;
                    break;
                }
            }
        }

        // Path 3: Estructura plana (sin envelope)
        if (!data && body?.MsgData?.Transaction?.PH_COLAB_ACT_TB) {
            data = body.MsgData.Transaction.PH_COLAB_ACT_TB;
        }

        // Si no encontramos la estructura esperada, devolver null
        if (!data) {
            console.warn("[psParser] No se encontró PH_COLAB_ACT_TB en la respuesta");
            console.warn("[psParser] Estructura recibida:", JSON.stringify(json, null, 2).substring(0, 500));
            return null;
        }

        // Mapear campos exactos del WSDL a nuestra interfaz
        return {
            emplid: extractField(data, ["EMPLID"]),
            // Nombre: preferir NAME_DISPLAY, fallback a FIRST_NAME + LAST_NAME100
            name: extractField(data, ["NAME_DISPLAY", "NAME_DISPLAY1"]) ||
                buildFullName(extractField(data, ["FIRST_NAME"]), extractField(data, ["LAST_NAME100"])),
            firstName: extractField(data, ["FIRST_NAME"]),
            lastName: extractField(data, ["LAST_NAME100"]),
            // Departamento
            departmentId: extractField(data, ["DEPTID"]),
            departmentName: extractField(data, ["DESCR1"]),
            // Puesto
            jobCode: extractField(data, ["JOBCODE"]),
            jobTitle: extractField(data, ["DESCR4", "DESCR"]),
            // Contacto
            email: extractField(data, ["EMAILID", "EMAIL_ADDR", "EMAIL_ADDR2"]),
            phone: null, // No hay campo de teléfono en el WSDL
            // Hotel
            hotelCode: extractField(data, ["PH_HOTEL_FLD"]),
            hotelName: extractField(data, ["DESCR40_1"]),
            // Otros
            location: extractField(data, ["LOCATION", "PH_LOCATION_PRINC"]),
            hrStatus: extractField(data, ["HR_STATUS"]),
            costCenter: extractField(data, ["HPYP_CC_ID", "DESCR40"]),
        };
    } catch (err) {
        console.error("[psParser] Error parsing response:", err);
        return null;
    }
}

/**
 * Construye nombre completo a partir de nombre y apellido
 */
function buildFullName(firstName: string | null, lastName: string | null): string | null {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ").trim() : null;
}

/**
 * Extrae un campo intentando múltiples nombres posibles
 */
function extractField(data: any, fieldNames: string[]): string | null {
    if (!data) return null;

    for (const name of fieldNames) {
        const value = data[name];
        if (value !== undefined && value !== null && value !== "") {
            // Manejar caso donde el valor puede ser un objeto con texto
            if (typeof value === "object" && value["#text"]) {
                return String(value["#text"]).trim();
            }
            return String(value).trim();
        }
    }

    return null;
}

/**
 * Debug: Imprime la estructura de la respuesta para desarrollo
 */
export function debugPrintStructure(json: any, depth = 0): void {
    if (depth > 5) return; // Limitar profundidad

    const indent = "  ".repeat(depth);

    if (typeof json !== "object" || json === null) {
        console.log(`${indent}Value: ${json}`);
        return;
    }

    for (const key of Object.keys(json)) {
        console.log(`${indent}${key}:`);
        debugPrintStructure(json[key], depth + 1);
    }
}

