// src/server/integrations/psBienesParser.ts
import "server-only";

/**
 * Bien de compañía asignado a un empleado (parseado del response PS)
 * Basado en PH_BIENES_EMPL_RESP > MsgData > Transaction > PH_BIENES_EM_TB
 */
export interface PSBienEmpleado {
    emplid: string;
    name: string;
    department: string;
    departmentId: string;
    position: string;
    positionId: string;
    propertyId: string;
    propertyDesc: string;
    hrStatus: string;
    dtIssued: string | null;
    dtReturned: string | null;
    notes: string | null;
    isActive: boolean; // true if DT_RETURNED is empty
}

/**
 * Parsea la respuesta JSON (de XML) del servicio PH_BIENES_POR_EMPLEADO
 * Retorna array de bienes asignados al empleado
 */
export function parseBienesEmpleadoResponse(json: any): PSBienEmpleado[] {
    try {
        // Navegar la estructura del envelope SOAP
        const envelope = json?.["soapenv:Envelope"] || json?.["soap:Envelope"] || json;
        const body = envelope?.["soapenv:Body"] || envelope?.["soap:Body"] || envelope;

        // Buscar el response
        let resp = body?.["PH_BIENES_EMPL_RESP"];
        if (!resp) {
            // Intentar con namespace
            const keys = Object.keys(body || {});
            for (const key of keys) {
                if (key.includes("BIENES_EMPL_RESP")) {
                    resp = body[key];
                    break;
                }
            }
        }

        if (!resp) {
            console.warn("[psBienesParser] No se encontró PH_BIENES_EMPL_RESP en la respuesta");
            return [];
        }

        // Obtener las transacciones
        const msgData = resp?.MsgData;
        if (!msgData) {
            console.warn("[psBienesParser] No se encontró MsgData");
            return [];
        }

        // Transaction puede ser un array o un objeto único
        let transactions = msgData?.Transaction;
        if (!transactions) return [];
        if (!Array.isArray(transactions)) {
            transactions = [transactions];
        }

        const bienes: PSBienEmpleado[] = [];

        for (const tx of transactions) {
            const data = tx?.PH_BIENES_EM_TB;
            if (!data) continue;

            const dtReturned = extractText(data.DT_RETURNED);

            bienes.push({
                emplid: extractText(data.EMPLID) || "",
                name: extractText(data.NAME_DISPLAY) || "",
                departmentId: extractText(data.DEPTID) || "",
                department: extractText(data.DESCR) || "",
                positionId: extractText(data.POSITION_NBR) || "",
                position: extractText(data.DESCR1) || "",
                propertyId: extractText(data.PROPERTY_ID) || "",
                propertyDesc: extractText(data.DESCR2) || "",
                hrStatus: extractText(data.HR_STATUS) || "",
                dtIssued: extractText(data.DT_ISSUED) || null,
                dtReturned: dtReturned || null,
                notes: extractText(data.DESCRLONG) || null,
                isActive: !dtReturned, // Activo si DT_RETURNED está vacío
            });
        }

        return bienes;
    } catch (err) {
        console.error("[psBienesParser] Error parsing response:", err);
        return [];
    }
}

/**
 * Extrae texto de un campo que puede ser string u objeto con #text
 */
function extractText(value: any): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") return value.trim() || null;
    if (typeof value === "object" && value["#text"]) {
        return String(value["#text"]).trim() || null;
    }
    return String(value).trim() || null;
}

/**
 * Filtra solo bienes activos (no devueltos)
 */
export function filterActiveBienes(bienes: PSBienEmpleado[]): PSBienEmpleado[] {
    return bienes.filter(b => b.isActive);
}

/**
 * Filtra solo bienes devueltos
 */
export function filterReturnedBienes(bienes: PSBienEmpleado[]): PSBienEmpleado[] {
    return bienes.filter(b => !b.isActive);
}
