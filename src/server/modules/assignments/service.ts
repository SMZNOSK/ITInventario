// src/server/modules/assignments/service.ts
import { prisma } from "@/lib/db";
import type {
  CreateAssignmentInput,
  UpdateAssignmentInput,
  CreateManualAssignmentInput,
} from "@/server/dto/assignments";
import { ensureCollaborator } from "@/server/modules/collaborators/service";

/* ========= Helpers comunes ========= */

function safeText(v: any): string {
  return (v ?? "").toString().trim();
}

function normalizeAssetCode(raw: string): string {
  return safeText(raw);
}

/** Soporta "13", "000013", "LAP-000013", "CPU-1" → 13/1 */
function parseIdFromMaybeCode(raw: string): number | null {
  const s = safeText(raw);
  if (!s) return null;

  // puro número
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  // formato PREFIX-000013 (o cualquier cosa-000013)
  const m = s.match(/-(\d+)\s*$/);
  if (m?.[1]) {
    const n = Number(m[1]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  return null;
}

/**
 * Resuelve un Asset a partir de:
 * - ID directo: "13"
 * - Código UI: "RAD-000001" (NO existe columna "code" en BD; se parsea el ID)
 * - Serial: "ABC123..."
 */
async function findAssetByCode(codeOrSerialOrId: string) {
  const trimmed = normalizeAssetCode(codeOrSerialOrId);
  if (!trimmed) {
    throw new Error("Debes indicar el ID, serial o código del equipo.");
  }

  // 1) Por id numérico directo o derivado de "RAD-000001"
  const idFromCode = parseIdFromMaybeCode(trimmed);
  if (idFromCode != null) {
    const byId = await prisma.asset.findUnique({ where: { id: idFromCode } });
    if (byId) return byId;
  }

  // 2) Por serial exacto (si serial es unique, findUnique es ideal)
  try {
    const bySerialUnique = await prisma.asset.findUnique({
      // si serial fuera nullable, Prisma igual soporta where por unique mientras sea string
      // @ts-ignore
      where: { serial: trimmed },
    });
    if (bySerialUnique) return bySerialUnique;
  } catch {
    // si el schema no permite findUnique por serial (poco probable), seguimos con findFirst
  }

  // 3) Por serial case-insensitive (más tolerante)
  const bySerialCI = await prisma.asset.findFirst({
    where: { serial: { equals: trimmed, mode: "insensitive" } },
  });
  if (bySerialCI) return bySerialCI;

  throw new Error("No se encontró ningún equipo con ese ID, serial o código.");
}

function buildAssetLabel(asset: {
  serial: string | null;
  type?: { name: string } | null;
  brand?: { name: string } | null;
  model?: { name: string } | null;
}) {
  const parts: string[] = [];
  if (asset.type?.name) parts.push(asset.type.name);
  if (asset.brand?.name) parts.push(asset.brand.name);
  if (asset.model?.name) parts.push(asset.model.name);

  const serial = asset.serial ?? "SIN-SERIE";
  const base = parts.join(" ");
  return base ? `${base} (${serial})` : serial;
}

async function resolvePlatformIdFromInput(input: any): Promise<number | null> {
  const rawId =
    input?.platformId ?? input?.platformID ?? input?.platform_id ?? null;

  if (rawId != null && rawId !== "") {
    const n = Number(rawId);
    if (Number.isFinite(n)) return n;
  }

  const rawName =
    input?.platformName ?? input?.platform ?? input?.platformLabel ?? null;

  if (rawName == null) return null;

  if (typeof rawName === "number" && Number.isFinite(rawName)) {
    return rawName;
  }

  const name = safeText(rawName);
  if (!name) return null;

  const maybeNum = Number(name);
  if (Number.isFinite(maybeNum)) return maybeNum;

  const found = await prisma.platform.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });

  return found?.id ?? null;
}

function resolveHotelLabelFromInput(input: any): string | null {
  const v = input?.hotelLabel ?? input?.hotelName ?? input?.hotel ?? null;
  const s = safeText(v);
  return s ? s : null;
}

/* ==================== Asignación normal ==================== */

export async function create(input: CreateAssignmentInput) {
  const collaboratorName =
    safeText(input.collaboratorName) || safeText(input.collaboratorId);

  // Resolver asset por id o por (serial/código derivado)
  const asset =
    input.assetId != null
      ? await prisma.asset.findUnique({ where: { id: input.assetId } })
      : await findAssetByCode(input.assetSerial ?? input.assetCode ?? "");

  if (!asset) {
    throw new Error("No se encontró el equipo a asignar.");
  }

  let collaborator = await ensureCollaborator(input.collaboratorId, {
    name: collaboratorName,
  });

  const incomingTeamName =
    input.teamName != null && safeText(input.teamName) !== ""
      ? safeText(input.teamName)
      : null;

  if (!collaborator.teamName && incomingTeamName) {
    collaborator = await prisma.collaborator.update({
      where: { id: collaborator.id },
      data: { teamName: incomingTeamName },
    });
  }

  const assignmentDate = new Date();

  // 1. Create assignment in local database
  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.assignment.create({
      data: {
        assetId: asset.id,
        collaboratorId: collaborator.id,
        collaboratorName: collaborator.name,
        departmentId: input.departmentId ?? null,
        platformId: input.platformId ?? null,
        status: "ASIGNADO",
        assignedAt: assignmentDate,
      },
    });

    await tx.asset.update({
      where: { id: asset.id },
      data: { status: "ASIGNADO" },
    });

    return created;
  });

  // 2. Sync with PeopleSoft (if enabled)
  if (process.env.PS_ENABLE === "1") {
    try {
      const { registrarBienPS } = await import("@/server/integrations/collabApi");

      console.log("[create] Sincronizando asignación con PeopleSoft...");
      console.log("[create] EMPLID:", collaborator.id);
      console.log("[create] PropertyID:", asset.serial);
      console.log("[create] Description:", asset.label || `Asset ${asset.serial}`);

      await registrarBienPS({
        emplid: collaborator.id,
        propertyId: asset.serial,
        description: asset.label || `Asset ${asset.serial}`,
        dtIssued: assignmentDate.toISOString().split('T')[0], // YYYY-MM-DD
      });

      console.log("[create] ✓ Asignación sincronizada con PeopleSoft");
    } catch (psError: any) {
      // ⚠️ If PS fails, log but don't revert local transaction
      console.error("[create] ⚠️ Error al sincronizar con PeopleSoft:", psError?.message);
      console.error("[create] La asignación se registró localmente pero no en PeopleSoft");
      // TODO: Could save to a retry queue
    }
  } else {
    console.log("[create] PeopleSoft sync disabled (PS_ENABLE != 1)");
  }

  return assignment;
}

/* ==================== Listado normal ==================== */

export async function list() {
  const assignments = await prisma.assignment.findMany({
    orderBy: { assignedAt: "desc" },
    include: {
      asset: {
        include: {
          currentHotel: true,
          type: true,
          brand: true,
          model: true,
        },
      },
      department: true,
      platform: true,
      collaborator: true,
    },
  });

  return assignments.map((a) => ({
    id: a.id,
    collaboratorId: a.collaboratorId,
    // Priorizar el nombre del colaborador relacionado sobre el campo denormalizado
    collaboratorName: a.collaborator?.name ?? a.collaboratorName ?? null,
    hotelName: a.asset.currentHotel?.name ?? null,
    departmentName: a.department?.name ?? null,
    assetSerial: a.asset.serial,
    assetLabel: buildAssetLabel(a.asset),
    platformName: a.platform?.name ?? null,
    status: a.status,
    assignedAt: a.assignedAt,
    returnedAt: a.returnedAt,
    teamName: a.collaborator?.teamName ?? null,
  }));
}


/* ========== Actualizar / eliminar / devolver (normal) ========== */

export async function update(id: number, input: UpdateAssignmentInput) {
  return prisma.assignment.update({
    where: { id },
    data: {
      departmentId:
        input.departmentId === undefined ? undefined : input.departmentId,
      platformId:
        input.platformId === undefined ? undefined : input.platformId,
    },
  });
}

export async function remove(id: number) {
  const existing = await prisma.assignment.findUnique({
    where: { id },
    select: { id: true, status: true, assetId: true },
  });

  if (!existing) throw new Error("Asignación no encontrada.");

  if (existing.status === "ASIGNADO") {
    throw new Error(
      "No puedes eliminar una asignación mientras el equipo siga asignado. Primero márcalo como devuelto.",
    );
  }

  await prisma.assignment.delete({ where: { id } });
}

export async function markReturned(id: number) {
  const existing = await prisma.assignment.findUnique({
    where: { id },
    include: {
      collaborator: true, // Need EMPLID
      asset: true,        // Need serial (propertyId)
    },
  });
  if (!existing) throw new Error("Asignación no encontrada");

  const returnDate = new Date();

  // 1. Update local database
  await prisma.$transaction(async (tx) => {
    await tx.assignment.update({
      where: { id },
      data: { status: "DEVUELTO", returnedAt: returnDate },
    });

    await tx.asset.update({
      where: { id: existing.assetId },
      data: { status: "ALTA" },
    });
  });

  // 2. Sync with PeopleSoft (if enabled)
  if (process.env.PS_ENABLE === "1") {
    try {
      const { devolverBienPS } = await import("@/server/integrations/collabApi");

      console.log("[markReturned] Sincronizando devolución con PeopleSoft...");
      console.log("[markReturned] EMPLID:", existing.collaborator.id);
      console.log("[markReturned] PropertyID:", existing.asset.serial);

      await devolverBienPS({
        emplid: existing.collaborator.id,
        propertyId: existing.asset.serial,
        dtReturned: returnDate.toISOString().split('T')[0], // YYYY-MM-DD
      });

      console.log("[markReturned] ✓ Devolución sincronizada con PeopleSoft");
    } catch (psError: any) {
      // ⚠️ If PS fails, log but don't revert local transaction
      console.error("[markReturned] ⚠️ Error al sincronizar con PeopleSoft:", psError?.message);
      console.error("[markReturned] La devolución se registró localmente pero no en PeopleSoft");
      // TODO: Could save to a retry queue
    }
  } else {
    console.log("[markReturned] PeopleSoft sync disabled (PS_ENABLE != 1)");
  }
}

/* ========== Asignaciones MANUALES (sin número de colaborador) ========== */

function normalizeManualStatus(s: any): "ASIGNADO" | "DEVUELTO" | null {
  const v = safeText(s).toUpperCase();
  if (v === "ASIGNADO") return "ASIGNADO";
  if (v === "DEVUELTO") return "DEVUELTO";
  return null;
}

async function mapManualItem(m: any, platformById?: Map<number, string>) {
  const assetLabel = m.asset ? buildAssetLabel(m.asset as any) : null;
  const serial = m.asset?.serial ?? null;

  const hotelFromRow =
    safeText(m.hotel) || safeText(m.hotelName) || safeText(m.hotelLabel);

  const hotelFallback = safeText(m.asset?.currentHotel?.name);
  const hotelResolved = hotelFromRow || hotelFallback || null;

  const platformIdResolved =
    m.platform?.id ?? (m.platformId != null ? Number(m.platformId) : null);

  const platformNameResolved =
    m.platform?.name ??
    (platformIdResolved != null ? platformById?.get(platformIdResolved) : null) ??
    null;

  return {
    id: m.id,

    collaboratorName: m.collaboratorName ?? null,
    collaboratorEmail: m.collaboratorEmail ?? null,
    direction: m.direction ?? null,
    department: m.department ?? null,

    hotel: hotelResolved,
    hotelName: hotelResolved,
    hotelLabel: hotelResolved,

    teamName: m.teamName ?? null,

    platformId: platformIdResolved,
    platformName: platformNameResolved,

    serial,
    equipmentName: assetLabel,
    equipmentLabel: assetLabel,

    assetId: m.assetId,
    assetSerial: serial,
    assetLabel,

    status: m.status ?? null,
    assignedAt: m.assignedAt ?? null,
    returnedAt: m.returnedAt ?? null,
    createdAt: m.assignedAt ?? null,
    notes: m.notes ?? m.description ?? null,
  };
}

// Crear asignación manual
export async function createManual(input: CreateManualAssignmentInput) {
  // input.assetCode viene desde UI (puede ser "RAD-000001" o serial o id)
  const asset = await findAssetByCode((input as any).assetCode);

  const resolvedPlatformId = await resolvePlatformIdFromInput(input as any);
  const resolvedHotel = resolveHotelLabelFromInput(input as any);

  const assignment = await prisma.$transaction(async (tx) => {
    const created = await tx.manualAssignment.create({
      data: {
        assetId: asset.id,

        collaboratorName: safeText((input as any).collaboratorName),
        collaboratorEmail: safeText((input as any).collaboratorEmail) || null,

        direction: safeText((input as any).direction) || null,
        department: safeText((input as any).department) || null,

        hotel: resolvedHotel,

        teamName: safeText((input as any).teamName) || null,

        platformId: resolvedPlatformId,

        description: safeText((input as any).description) || null,

        status: "ASIGNADO",
        assignedAt: new Date(),
      },
    });

    await tx.asset.update({
      where: { id: asset.id },
      data: { status: "ASIGNADO" },
    });

    return created;
  });

  return assignment;
}

// Listado manual
export async function listManual() {
  const items = await prisma.manualAssignment.findMany({
    orderBy: { assignedAt: "desc" },
    include: {
      asset: {
        select: {
          id: true,
          serial: true,
          type: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
          currentHotel: { select: { name: true } } as any,
        } as any,
      },
      platform: { select: { id: true, name: true } },
    },
  });

  const missingPlatformIds = Array.from(
    new Set(
      items
        .filter((m: any) => !m?.platform?.name && m?.platformId)
        .map((m: any) => Number(m.platformId))
        .filter((n: number) => Number.isFinite(n)),
    ),
  );

  const platformById = new Map<number, string>();
  if (missingPlatformIds.length > 0) {
    const plats = await prisma.platform.findMany({
      where: { id: { in: missingPlatformIds } },
      select: { id: true, name: true },
    });
    for (const p of plats) platformById.set(p.id, p.name);
  }

  const out = [];
  for (const m of items as any[]) out.push(await mapManualItem(m, platformById));
  return out;
}

export async function getManual(id: number) {
  const m = await prisma.manualAssignment.findUnique({
    where: { id },
    include: {
      asset: {
        select: {
          id: true,
          serial: true,
          type: { select: { name: true } },
          brand: { select: { name: true } },
          model: { select: { name: true } },
          currentHotel: { select: { name: true } } as any,
        } as any,
      },
      platform: { select: { id: true, name: true } },
    },
  });

  if (!m) throw new Error("Asignación manual no encontrada.");
  return mapManualItem(m);
}

export async function updateManual(id: number, input: any) {
  const existing = await prisma.manualAssignment.findUnique({
    where: { id },
    select: { id: true, status: true, assetId: true, returnedAt: true },
  });

  if (!existing) throw new Error("Asignación manual no encontrada.");

  let nextStatus: "ASIGNADO" | "DEVUELTO" | null = null;

  if (input?.markReturned === true) nextStatus = "DEVUELTO";
  if (input?.status != null) {
    const s = normalizeManualStatus(input.status);
    if (s) nextStatus = s;
  }

  const hotelTouched =
    "hotel" in (input ?? {}) ||
    "hotelName" in (input ?? {}) ||
    "hotelLabel" in (input ?? {});
  const resolvedHotel = hotelTouched
    ? resolveHotelLabelFromInput(input)
    : undefined;

  const platformTouched =
    "platformId" in (input ?? {}) ||
    "platformName" in (input ?? {}) ||
    "platform" in (input ?? {}) ||
    "platformLabel" in (input ?? {});
  const resolvedPlatformId = platformTouched
    ? await resolvePlatformIdFromInput(input)
    : undefined;

  const data: any = {};

  if ("direction" in (input ?? {})) {
    const v = input.direction;
    data.direction = v === null ? null : safeText(v) || null;
  }

  if ("department" in (input ?? {})) {
    const v = input.department;
    data.department = v === null ? null : safeText(v) || null;
  }

  if (hotelTouched) data.hotel = resolvedHotel ?? null;

  if ("teamName" in (input ?? {})) {
    const v = input.teamName;
    data.teamName = v === null ? null : safeText(v) || null;
  }

  if (platformTouched) data.platformId = resolvedPlatformId ?? null;

  if ("notes" in (input ?? {}) || "description" in (input ?? {})) {
    const v = input.notes ?? input.description;
    data.description = v === null ? null : safeText(v) || null;
  }

  let assetNextStatus: "ALTA" | "ASIGNADO" | null = null;

  if (nextStatus === "DEVUELTO") {
    data.status = "DEVUELTO";
    data.returnedAt = new Date();
    assetNextStatus = "ALTA";
  } else if (nextStatus === "ASIGNADO") {
    data.status = "ASIGNADO";
    data.returnedAt = null;
    assetNextStatus = "ASIGNADO";
  }

  await prisma.$transaction(async (tx) => {
    await tx.manualAssignment.update({ where: { id }, data });

    if (assetNextStatus) {
      await tx.asset.update({
        where: { id: existing.assetId },
        data: { status: assetNextStatus },
      });
    }
  });

  return getManual(id);
}

export async function removeManual(id: number) {
  const existing = await prisma.manualAssignment.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) throw new Error("Asignación manual no encontrada.");

  const st = normalizeManualStatus(existing.status);
  if (st === "ASIGNADO") {
    throw new Error(
      "No puedes eliminar una asignación mientras el equipo siga asignado. Primero márcalo como devuelto.",
    );
  }

  await prisma.manualAssignment.delete({ where: { id } });
  return { ok: true };
}
