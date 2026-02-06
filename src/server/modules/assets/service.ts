// src/server/modules/assets/service.ts
import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type {
  CreateAssetInput,
  UpdateAssetInput,
  InventoryAssetInput,
} from "@/server/dto/assets";

/**
 * Filtros opcionales para el listado de activos.
 * Los usamos desde /api/assets (q, status, hotelId, page, pageSize).
 */
export type AssetListFilters = {
  q?: string;
  status?: string;  // "ALTA", "ASIGNADO", etc.
  hotelId?: number; // currentHotelId
  page?: number;
  pageSize?: number;
};

/**
 * Shape que exponemos a la API/UI (incluye nombres de relaciones).
 */
export type AssetListItem = {
  id: number;
  serial: string;
  status: string;
  typeId: number | null;
  brandId: number | null;
  modelId: number | null;
  currentHotelId: number | null;
  typeName: string | null;
  brandName: string | null;
  modelName: string | null;
  hotelName: string | null;

  // Campos administrativos nuevos
  overThreeYears: boolean;
  invoiceNumber: string | null;
  invoiceDate: string | null; // ISO string o null
};

/* ========= helpers internos ========= */

function mapAssetRow(a: any): AssetListItem {
  return {
    id: a.id,
    serial: a.serial,
    // Usar el estado real calculado si existe, de lo contrario usar el almacenado
    status: a._realStatus ?? a.status,
    typeId: a.typeId ?? null,
    brandId: a.brandId ?? null,
    modelId: a.modelId ?? null,
    currentHotelId: a.currentHotelId ?? null,
    typeName: a.type?.name ?? null,
    brandName: a.brand?.name ?? null,
    modelName: a.model?.name ?? null,
    hotelName: a.currentHotel?.name ?? null,

    overThreeYears: Boolean(a.overThreeYears),
    invoiceNumber: a.invoiceNumber ?? null,
    invoiceDate: a.invoiceDate ? new Date(a.invoiceDate).toISOString() : null,
  };
}

/**
 * Enriquece una lista de activos con su estado REAL calculado
 * basándose en las asignaciones activas.
 * 
 * Reglas:
 * - Si hay una Assignment con status="ASIGNADO" → ASIGNADO
 * - Si hay una ManualAssignment con status="ASIGNADO" → ASIGNADO
 * - Si hay un Loan activo (endDate > now) → ASIGNADO
 * - Si el status almacenado es BAJA o TRANSFERENCIA_PENDIENTE → se respeta
 * - De lo contrario → ALTA
 */
async function enrichAssetsWithRealStatus<T extends { id: number; status: string }>(assets: T[]): Promise<T[]> {
  if (assets.length === 0) return assets;

  const assetIds = assets.map((a) => a.id);

  // 1. Buscar asignaciones activas (Assignment)
  const activeAssignments = await prisma.assignment.findMany({
    where: {
      assetId: { in: assetIds },
      status: "ASIGNADO",
    },
    select: { assetId: true },
  });
  const assignedByAssignment = new Set(activeAssignments.map((a) => a.assetId));

  // 2. Buscar asignaciones manuales activas (ManualAssignment)
  const activeManualAssignments = await prisma.manualAssignment.findMany({
    where: {
      assetId: { in: assetIds },
      status: "ASIGNADO",
    },
    select: { assetId: true },
  });
  const assignedByManual = new Set(activeManualAssignments.map((a) => a.assetId));

  // 3. Para préstamos, necesitamos buscar por serial ya que Loan no tiene assetId directo
  //    Esto es más complejo, así que buscamos todos los préstamos activos y extraemos seriales
  const now = new Date();
  const activeLoans = await prisma.loan.findMany({
    where: { endDate: { gt: now } },
    select: { deviceName: true, teamName: true },
  });

  // Extraer seriales de los préstamos activos
  const activeLoanSerials = new Set<string>();
  for (const loan of activeLoans) {
    const serial = extractSerialFromLoanStrings(loan.deviceName, loan.teamName);
    if (serial) activeLoanSerials.add(serial.toUpperCase());
  }

  // Crear mapa de serial a assetId para los activos que estamos consultando
  const assetSerialToId = new Map<string, number>();
  for (const a of assets) {
    if ((a as any).serial) {
      assetSerialToId.set(((a as any).serial as string).toUpperCase(), a.id);
    }
  }

  // Ver cuáles de nuestros activos están en préstamos activos
  const assignedByLoan = new Set<number>();
  for (const serial of activeLoanSerials) {
    const assetId = assetSerialToId.get(serial);
    if (assetId) assignedByLoan.add(assetId);
  }

  // 4. Calcular el estado real para cada activo
  return assets.map((asset) => {
    const storedStatus = asset.status;

    // Respetar estados especiales
    if (storedStatus === "BAJA" || storedStatus === "TRANSFERENCIA_PENDIENTE") {
      return { ...asset, _realStatus: storedStatus };
    }

    // Verificar si tiene alguna asignación activa
    const hasActiveAssignment =
      assignedByAssignment.has(asset.id) ||
      assignedByManual.has(asset.id) ||
      assignedByLoan.has(asset.id);

    const realStatus = hasActiveAssignment ? "ASIGNADO" : "ALTA";
    return { ...asset, _realStatus: realStatus };
  });
}

/**
 * Extrae el serial de un préstamo desde deviceName o teamName.
 */
function extractSerialFromLoanStrings(deviceName: string | null, teamName: string | null): string | null {
  const str = deviceName || teamName || "";

  // Buscar patrón "S/N: SERIAL123"
  const snMatch = str.match(/S\/N:\s*([A-Za-z0-9-]+)/i);
  if (snMatch?.[1]) return snMatch[1].trim();

  return null;
}

/* ========= Crear ========= */

/**
 * create → flujo legacy (assetCode/kind/model/serial/purchasedAt).
 * Lo dejamos tal cual para no romper nada que ya funcione.
 * OJO: este flujo probablemente no se use con el modelo Asset actual.
 */
export function create(data: CreateAssetInput) {
  // Si en algún momento vuelves a usar este flujo habría que mapear
  // los campos legacy a las columnas reales de Asset.
  return prisma.asset.create({
    // @ts-expect-error flujo legacy – pendiente de mapear a columnas reales
    data,
  });
}

/**
 * createFromInventory → flujo nuevo de la pantalla de Captura.
 *
 * Persistimos:
 *   - typeId, brandId, modelId
 *   - currentHotelId
 *   - serial
 *   - status (forzamos "ALTA")
 *   - overThreeYears (desde olderThan3Years)
 *   - invoiceNumber, invoiceDate
 */
export function createFromInventory(input: InventoryAssetInput) {
  const data: Prisma.AssetUncheckedCreateInput = {
    serial: input.serial.trim(),
    typeId: input.typeId,
    currentHotelId: input.currentHotelId,
    status: "ALTA",
    overThreeYears: Boolean(input.olderThan3Years),
  };

  if (typeof input.brandId === "number") {
    data.brandId = input.brandId;
  }
  if (typeof input.modelId === "number") {
    data.modelId = input.modelId;
  }

  // Solo guardamos factura si NO está marcado como mayor a 3 años
  if (!input.olderThan3Years) {
    if (input.invoiceNumber && input.invoiceNumber.trim() !== "") {
      data.invoiceNumber = input.invoiceNumber.trim();
    }
    if (input.invoiceDate) {
      // Viene como string (p.ej. ISO o "2025-12-28"), lo parseamos a Date
      data.invoiceDate = new Date(input.invoiceDate);
    }
  } else {
    data.invoiceNumber = null;
    data.invoiceDate = null;
  }

  // Nota: invoiceProviderId todavía no existe en el modelo Asset,
  // cuando agregues la columna se mapea también aquí.

  return prisma.asset.create({ data });
}

/* ========= Listar =========
 *
 * - Si NO recibe filtros → devuelve SOLO AssetListItem[] (modo simple).
 * - Si recibe filtros → devuelve { items, total, page, pageSize } (paginado).
 */
export async function list(
  filters?: AssetListFilters,
): Promise<
  | AssetListItem[]
  | {
    items: AssetListItem[];
    total: number;
    page: number;
    pageSize: number;
  }
> {
  // Modo sencillo (sin filtros/paginación explícita)
  if (!filters) {
    const rows = await prisma.asset.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        type: true,
        brand: true,
        model: true,
        currentHotel: true,
      },
    });

    // Enriquecer con estado real calculado
    const enrichedRows = await enrichAssetsWithRealStatus(rows);
    return enrichedRows.map(mapAssetRow);
  }

  const { q, status, hotelId, page = 1, pageSize = 20 } = filters;

  // Determinar si el filtro de status requiere cálculo en tiempo real
  // Para ASIGNADO y ALTA, necesitamos calcular el estado real primero
  const statusRequiresRealTimeCalc = status === "ASIGNADO" || status === "ALTA";

  const where: Prisma.AssetWhereInput = {};

  // Solo aplicar filtro de status a nivel de BD para estados que NO requieren cálculo
  // (BAJA, TRANSFERENCIA_PENDIENTE se respetan tal cual están almacenados)
  if (status && !statusRequiresRealTimeCalc) {
    where.status = status as any;
  }

  if (hotelId) {
    where.currentHotelId = hotelId;
  }

  if (q && q.trim() !== "") {
    const term = q.trim();
    where.OR = [
      {
        serial: {
          contains: term,
          mode: "insensitive",
        },
      },
      {
        model: {
          name: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
      {
        brand: {
          name: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
      {
        type: {
          name: {
            contains: term,
            mode: "insensitive",
          },
        },
      },
    ];
  }

  // Si el status requiere cálculo en tiempo real, traemos todos y filtramos después
  if (statusRequiresRealTimeCalc) {
    // Para filtros con estado calculado, traemos todos los activos que no están en BAJA ni TRANSFERENCIA_PENDIENTE
    const whereForRealTimeCalc: Prisma.AssetWhereInput = {
      ...where,
      status: { notIn: ["BAJA", "TRANSFERENCIA_PENDIENTE"] },
    };

    const allRows = await prisma.asset.findMany({
      where: whereForRealTimeCalc,
      orderBy: { createdAt: "desc" },
      include: {
        type: true,
        brand: true,
        model: true,
        currentHotel: true,
      },
    });

    // Enriquecer con estado real
    const enrichedRows = await enrichAssetsWithRealStatus(allRows);

    // Filtrar por el estado calculado
    const filteredRows = enrichedRows.filter((r: any) => {
      const realStatus = r._realStatus ?? r.status;
      return realStatus === status;
    });

    // Aplicar paginación manual
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(100, Math.max(1, pageSize));
    const skip = (safePage - 1) * safePageSize;
    const paginatedRows = filteredRows.slice(skip, skip + safePageSize);

    return {
      items: paginatedRows.map(mapAssetRow),
      total: filteredRows.length,
      page: safePage,
      pageSize: safePageSize,
    };
  }

  // Flujo normal para estados que no requieren cálculo (BAJA, TRANSFERENCIA_PENDIENTE)
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const skip = (safePage - 1) * safePageSize;

  const [rows, total] = await prisma.$transaction([
    prisma.asset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: safePageSize,
      include: {
        type: true,
        brand: true,
        model: true,
        currentHotel: true,
      },
    }),
    prisma.asset.count({ where }),
  ]);

  // Enriquecer con estado real calculado
  const enrichedRows = await enrichAssetsWithRealStatus(rows);
  return {
    items: enrichedRows.map(mapAssetRow),
    total,
    page: safePage,
    pageSize: safePageSize,
  };
}

/* ========= Obtener / Actualizar ========= */

export function get(id: number) {
  return prisma.asset.findUnique({
    where: { id },
    include: {
      type: true,
      brand: true,
      model: true,
      currentHotel: true,
    },
  });
}

/**
 * update → mapea campos que existen en el modelo Asset:
 *   - serial (por si algún flujo legacy lo toca)
 *   - overThreeYears (desde overThreeYears u olderThan3Years)
 *   - invoiceNumber, invoiceDate
 */
export function update(id: number, input: UpdateAssetInput) {
  const data: Prisma.AssetUpdateInput = {};

  // Serial (por si algún flujo viejo lo sigue mandando)
  if (input.serial !== undefined) {
    data.serial = input.serial;
  }

  // Flag de +3 años
  const over3 =
    typeof (input as any).overThreeYears === "boolean"
      ? (input as any).overThreeYears
      : typeof (input as any).olderThan3Years === "boolean"
        ? (input as any).olderThan3Years
        : undefined;

  if (over3 !== undefined) {
    data.overThreeYears = over3;
  }

  // Factura: número
  if ((input as any).invoiceNumber !== undefined) {
    const num = (input as any).invoiceNumber as string | null;
    data.invoiceNumber =
      num && num.trim().length > 0 ? num.trim() : null; // null limpia la factura
  }

  // Factura: fecha
  if ((input as any).invoiceDate !== undefined) {
    const d = (input as any).invoiceDate as string | null;
    data.invoiceDate = d ? new Date(d) : null; // null la borra
  }

  // Nota: invoiceProviderId todavía no existe en el modelo Asset,
  // por eso lo ignoramos aquí. Cuando agregues la columna se mapea igual.

  return prisma.asset.update({
    where: { id },
    data,
  });
}

/**
 * (Opcional) Eliminar activo físico.
 */
export function remove(id: number) {
  return prisma.asset.delete({ where: { id } });
}
