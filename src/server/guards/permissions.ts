// src/server/guards/permissions.ts
import "server-only";
import type { AppRole } from "./auth";

/**
 * Mapa central de permisos por módulo
 * 
 * Define qué roles pueden realizar qué acciones en cada módulo.
 * - READ: Leer/listar datos
 * - WRITE: Crear/editar/eliminar datos
 */

export type Permission = "READ" | "WRITE";
export type Module =
    | "ADMIN_USERS"
    | "ADMIN_HOTELS"
    | "CATALOG"
    | "ASSETS"
    | "LOANS"
    | "ASSIGNMENTS"
    | "DISPOSALS"
    | "REPORTS";

/**
 * Matriz de permisos: { [módulo]: { [acción]: roles permitidos } }
 */
const PERMISSIONS: Record<Module, Record<Permission, AppRole[]>> = {
    // ========== ADMINISTRACIÓN (solo ADMIN) ==========
    ADMIN_USERS: {
        READ: ["ADMIN"],
        WRITE: ["ADMIN"],
    },
    ADMIN_HOTELS: {
        READ: ["ADMIN"],
        WRITE: ["ADMIN"],
    },

    // ========== CATÁLOGOS (CRUD: ADMIN/ALMACEN, Lectura: todos) ==========
    CATALOG: {
        READ: ["ADMIN", "ALMACEN", "INGENIERO"],
        WRITE: ["ADMIN", "ALMACEN"],
    },

    // ========== ACTIVOS/INVENTARIO ==========
    // INGENIERO puede capturar (CREATE) cuando almacén no está
    ASSETS: {
        READ: ["ADMIN", "ALMACEN", "INGENIERO"],
        WRITE: ["ADMIN", "ALMACEN", "INGENIERO"], // TODO: Confirmar si INGENIERO solo CREATE
    },

    // ========== PRÉSTAMOS ==========
    // INGENIERO tiene acceso pero con hotel scope
    LOANS: {
        READ: ["ADMIN", "ALMACEN", "INGENIERO"],
        WRITE: ["ADMIN", "INGENIERO"], // ALMACEN no por defecto
    },

    // ========== ASIGNACIONES/RESGUARDOS ==========
    ASSIGNMENTS: {
        READ: ["ADMIN", "ALMACEN", "INGENIERO"],
        WRITE: ["ADMIN", "INGENIERO"],
    },

    // ========== BAJAS ==========
    DISPOSALS: {
        READ: ["ADMIN", "ALMACEN", "INGENIERO"],
        WRITE: ["ADMIN", "ALMACEN"],
    },

    // ========== REPORTES ==========
    // ADMIN: todos, ALMACEN/INGENIERO: solo los 5 permitidos
    REPORTS: {
        READ: ["ADMIN", "ALMACEN", "INGENIERO"],
        WRITE: ["ADMIN"], // Solo ADMIN puede crear/modificar configuraciones de reportes
    },
};

/**
 * Verifica si un rol puede realizar una acción en un módulo
 */
export function canAccess(module: Module, permission: Permission, role: AppRole): boolean {
    const allowed = PERMISSIONS[module]?.[permission];
    if (!allowed) return false;
    return allowed.includes(role);
}

/**
 * Verifica si un rol puede leer en un módulo
 */
export function canRead(module: Module, role: AppRole): boolean {
    return canAccess(module, "READ", role);
}

/**
 * Verifica si un rol puede escribir en un módulo
 */
export function canWrite(module: Module, role: AppRole): boolean {
    return canAccess(module, "WRITE", role);
}

/**
 * Obtiene todos los roles que pueden realizar una acción en un módulo
 */
export function getAllowedRoles(module: Module, permission: Permission): AppRole[] {
    return PERMISSIONS[module]?.[permission] ?? [];
}

/**
 * Reportes permitidos para roles no-ADMIN
 */
export const ALLOWED_REPORTS_FOR_NON_ADMIN = [
    "general-equipos-status",
    "equipos-baja",
    "equipos-sin-asignar",
    "reporte-prestamos",
    "reporte-resguardos",
];

/**
 * Verifica si un rol puede acceder a un reporte específico
 */
export function canAccessReport(reportId: string, role: AppRole): boolean {
    if (role === "ADMIN") return true;
    if (role === "ALMACEN" || role === "INGENIERO") {
        return ALLOWED_REPORTS_FOR_NON_ADMIN.includes(reportId);
    }
    return false;
}
