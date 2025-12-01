// src/lib/api.ts

// Si apuntas a un backend externo, define NEXT_PUBLIC_API_BASE (p. ej. "http://localhost:3001").
// Si NO está definida, usará mismo origen (las rutas /api de Next).
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

/** Construye URL absoluta respetando rutas absolutas (http/https) */
function buildUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path}`;
}

/* ===== helpers internos ===== */
const isBrowser = typeof window !== "undefined";
const isFormData = (b: any): b is FormData =>
  isBrowser && typeof FormData !== "undefined" && b instanceof FormData;
const isBlob = (b: any): b is Blob =>
  (isBrowser && typeof Blob !== "undefined" && b instanceof Blob) ||
  (b && typeof b.arrayBuffer === "function" && typeof b.type === "string");
const isArrayBufferView = (b: any): b is ArrayBufferView =>
  b && ArrayBuffer.isView && ArrayBuffer.isView(b);
const isArrayBufferLike = (b: any): b is ArrayBuffer =>
  b && typeof b.byteLength === "number" && typeof b.slice === "function";

function looksLikeJsonContentType(ct: string) {
  const v = ct.toLowerCase();
  return (
    v.includes("application/json") ||
    v.includes("+json") ||
    v.includes("problem+json")
  );
}

/** Core: fetch con manejo fino de errores, 204 y contenido no-JSON */
export async function api<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = buildUrl(path);
  const headers = new Headers(init.headers || {});

  const hasBody = init.body != null;
  const shouldSetJsonCT =
    hasBody &&
    !headers.has("Content-Type") &&
    !(
      isFormData(init.body) ||
      isBlob(init.body) ||
      isArrayBufferView(init.body) ||
      isArrayBufferLike(init.body)
    );

  if (shouldSetJsonCT) headers.set("Content-Type", "application/json");

  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers,
  });

  const raw = await res.text().catch(() => "");

  if (!res.ok) {
    let msg = `HTTP ${res.status} ${res.statusText}`;
    let body: any = null;

    try {
      if (raw && looksLikeJsonContentType(res.headers.get("content-type") || "")) {
        body = JSON.parse(raw);
        const found =
          body?.error ??
          body?.message ??
          body?.msg ??
          (Array.isArray(body?.errors)
            ? body.errors.map((e: any) => e?.message ?? e).join(" · ")
            : null);
        if (found) msg = String(found);
      } else if (raw) {
        msg = `${msg} — ${raw}`;
      }
    } catch {
      if (raw) msg = `${msg} — ${raw}`;
    }

    const err = new Error(msg) as Error & {
      status?: number;
      body?: any;
      raw?: string;
      url?: string;
    };
    err.status = res.status;
    err.body = body ?? raw;
    err.raw = raw;
    err.url = url;
    throw err;
  }

  if (!raw || res.status === 204) return {} as T;

  const ctype = res.headers.get("content-type") || "";
  if (looksLikeJsonContentType(ctype)) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      // caer a texto
    }
  }

  return (raw as unknown) as T;
}

/** Azúcar para enviar JSON sin repetir stringify */
export function apiJSON<T = any>(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  init: RequestInit = {}
) {
  return api<T>(path, {
    ...init,
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/* ========= Tipos comunes ========= */

export type ListResponse<T> = { items: T[] };

export type CollaboratorItem = {
  id: string;
  numColaborador: string;
  nombre: string;
  departamento?: string;
  email?: string;
};

export type AssetItem = {
  id: number;
  serial: string;
  typeId: number;
  brandId: number;
  modelId: number;
  currentHotelId: number | null;
  status: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
};

export type AssignmentItem = {
  id: string;
  assetSerial: string;
  collaboratorId: string;
  collaboratorName: string;
  status: "ASIGNADO" | "DEVUELTO";
  assignedAt: string;
  returnedAt?: string;
};

export type DisposalItem = {
  id: string;
  assetId?: number;
  assetSerial?: string;
  serial?: string;
  reason: string;
  evidence?: string | null;
  evidenceUrl?: string;
  disposedAt: string;
};

/* ========= Auth helpers ========= */

export type AppRole = "ADMIN" | "ALMACEN" | "INGENIERO";

export type MePayload = {
  ok: boolean;
  user: {
    id: number;
    username: string;
    name: string;
    role: AppRole;
    status: "ALTA" | "INACTIVO";
    hotels?: number[];
  };
};

export function apiLogin(username: string, password: string) {
  return api<any>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function apiMe() {
  return api<MePayload>("/api/auth/me");
}

export function apiLogout() {
  return api<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

/* ========= Recursos “planos” ========= */

export function fetchCollaborators() {
  return api<ListResponse<CollaboratorItem>>("/api/collaborators");
}

export function fetchAssets() {
  return api<ListResponse<AssetItem>>("/api/assets");
}

export function fetchAssignments() {
  return api<ListResponse<AssignmentItem>>("/api/assignments");
}

export function fetchDisposals() {
  return api<ListResponse<DisposalItem>>("/api/disposals");
}

/* ========= Catálogos ========= */

export type TypeItem = { id: number; name: string; active?: boolean | null };
export type BrandItem = { id: number; name: string; typeId?: number | null };
export type ModelItem = {
  id: number;
  name: string;
  typeId?: number | null;
  brandId?: number | null;
  status?: "ALTA" | "BAJA" | string | null;
};
export type ProviderItem = { id: number; name: string; active?: boolean | null };

/** Catálogo de sistemas operativos (nuevo) */
export type OperatingSystemItem = {
  id: number;
  name: string;
  vendor?: string | null;
  active?: boolean | null;
};

export const Catalog = {
  /* ----- Types ----- */
  listTypes: async () => {
    const r = await api<any>("/api/catalog/types");
    const raw: any[] =
      (r.items as any[] | undefined) ??
      (r.tipos as any[] | undefined) ??
      [];
    const items: TypeItem[] = raw.map((t) => ({
      id: t.id ?? t.id_tipo_equipo ?? t.ID,
      name: t.name ?? t.nombre ?? t.nombre_tipo ?? "",
      active:
        typeof t.active === "boolean"
          ? t.active
          : t.estado
          ? String(t.estado).toUpperCase() === "ALTA"
          : true,
    }));
    return { items };
  },

  createType: (name: string) =>
    api<any>("/api/catalog/types", {
      method: "POST",
      body: JSON.stringify({ name, nombre: name, nombre_tipo: name }),
    }),

  updateType: (
    id: number,
    data: Partial<Pick<TypeItem, "name" | "active">>
  ) =>
    api<any>(`/api/catalog/types/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteType: (id: number) =>
    api<void>(`/api/catalog/types/${id}`, { method: "DELETE" }),

  /* ----- Brands ----- */
  listBrands: async (typeId?: number) => {
    const qs = typeof typeId === "number" ? `?typeId=${typeId}` : "";
    const r = await api<any>(`/api/catalog/brands${qs}`);
    const raw: any[] =
      (r.items as any[] | undefined) ??
      (r.marcas as any[] | undefined) ??
      (r.brands as any[] | undefined) ??
      [];
    const items: BrandItem[] = raw.map((b) => ({
      id: b.id ?? b.id_marca ?? b.ID,
      name: b.name ?? b.nombre_marca ?? b.nombre ?? "",
      typeId: b.typeId ?? b.id_tipo_equipo ?? null,
    }));
    return { items };
  },

  createBrand: (name: string) =>
    api<any>("/api/catalog/brands", {
      method: "POST",
      body: JSON.stringify({ name, nombre_marca: name }),
    }),

  updateBrand: (id: number, name: string) =>
    api<any>(`/api/catalog/brands/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, nombre_marca: name }),
    }),

  deleteBrand: (id: number) =>
    api<any>(`/api/catalog/brands/${id}`, { method: "DELETE" }),

  /* ----- Models ----- */
  listModels: (filters?: { typeId?: number; brandId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.typeId) params.set("typeId", String(filters.typeId));
    if (filters?.brandId) params.set("brandId", String(filters.brandId));
    const qs = params.toString() ? `?${params.toString()}` : "";
    return api<{ items: ModelItem[] }>(`/api/catalog/models${qs}`);
  },

  createModel: (name: string, typeId: number, brandId: number) =>
    api<any>("/api/catalog/models", {
      method: "POST",
      body: JSON.stringify({
        nombre: name,
        name,
        idTipo: typeId,
        typeId,
        idMarca: brandId,
        brandId,
      }),
    }),

  /** Nuevo helper para PATCH /api/catalog/models/[id]/estado */
  updateModelStatus: (id: number, estado: "ALTA" | "BAJA") =>
    apiJSON(`/api/catalog/models/${id}/estado`, "PATCH", { estado }),

  // (dejamos updateModel y deleteModel por compatibilidad)
  updateModel: (
    id: number,
    data: Partial<Pick<ModelItem, "name" | "status">>
  ) =>
    api<any>(`/api/catalog/models/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteModel: (id: number) =>
    api<void>(`/api/catalog/models/${id}`, { method: "DELETE" }),

  /* ----- Providers ----- */
  listProviders: async () => {
    const r = await api<any>("/api/catalog/providers");
    const raw: any[] =
      (r.items as any[] | undefined) ??
      (r.providers as any[] | undefined) ??
      (r.proveedores as any[] | undefined) ??
      [];
    const items: ProviderItem[] = raw.map((p) => ({
      id: p.id ?? p.id_proveedor ?? p.ID,
      name: p.name ?? p.nombre ?? "",
      active:
        typeof p.active === "boolean"
          ? p.active
          : p.estado
          ? String(p.estado).toUpperCase() === "ALTA"
          : true,
    }));
    return { items };
  },

  createProvider: (name: string) =>
    api<any>("/api/catalog/providers", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  // Puede recibir: (id, "Nuevo nombre")  o  (id, { name?, active? })
  updateProvider: (
    id: number,
    data: string | Partial<Pick<ProviderItem, "name" | "active">>
  ) => {
    const payload =
      typeof data === "string"
        ? { name: data }
        : data ?? {};

    return api<any>(`/api/catalog/providers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteProvider: (id: number) =>
    api<void>(`/api/catalog/providers/${id}`, { method: "DELETE" }),

  /* ----- Operating Systems (Sistemas Operativos) ----- */
  listOperatingSystems: async () => {
    const r = await api<any>("/api/catalog/os");
    const raw: any[] =
      (r.items as any[] | undefined) ??
      (r.sistemas as any[] | undefined) ??
      (r.operatingSystems as any[] | undefined) ??
      [];

    const items: OperatingSystemItem[] = raw.map((o) => ({
      id: o.id ?? o.ID,
      name: o.name ?? o.nombre ?? o.nombre_so ?? "",
      vendor: o.vendor ?? null,
      active:
        typeof o.isActive === "boolean"
          ? o.isActive
          : o.estado
          ? String(o.estado).toUpperCase() === "ALTA"
          : true,
    }));

    return { items };
  },

  createOperatingSystem: (name: string, vendor?: string) =>
    apiJSON("/api/catalog/os", "POST", {
      name,
      nombre: name,
      nombre_so: name,
      vendor,
    }),
};
