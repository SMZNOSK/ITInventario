// src/server/dto/assets.ts
import { z } from "zod";

/**
 * DTO legacy que usabas antes (assetCode/kind/etc.).
 * Lo dejamos tal cual para no romper importaciones o flujos existentes.
 */
export const CreateAssetDTO = z.object({
  assetCode: z.string().min(1),
  kind: z.string().min(1),
  model: z.string().optional(),
  serial: z.string().optional(),
  purchasedAt: z.coerce.date().optional(),
});

/**
 * DTO para actualizar un activo existente.
 *
 * - Mantiene todos los campos legacy como opcionales (partial del CreateAssetDTO)
 * - Añade los campos administrativos nuevos:
 *    - overThreeYears / olderThan3Years (alias)
 *    - invoiceProviderId, invoiceNumber, invoiceDate
 *
 * En el servicio (`assets/service.ts`) podremos mapear:
 *   - `overThreeYears ?? olderThan3Years` → columna booleana en Asset
 *   - `invoiceProviderId`, `invoiceNumber`, `invoiceDate` → columnas de factura
 */
export const UpdateAssetDTO = CreateAssetDTO.partial().extend({
  // Bandera booleana: equipo con +3 años
  overThreeYears: z.boolean().optional(),
  olderThan3Years: z.boolean().optional(), // alias para compatibilidad

  // Datos de factura ligados al equipo
  invoiceProviderId: z.number().int().positive().nullable().optional(),
  invoiceNumber: z.string().nullable().optional(),
  invoiceDate: z.string().nullable().optional(), // ISO string o null
});

export type CreateAssetInput = z.infer<typeof CreateAssetDTO>;
export type UpdateAssetInput = z.infer<typeof UpdateAssetDTO>;

/**
 * DTO nuevo para la pantalla de Captura de inventario.
 * Aquí validamos exactamente lo que envía el formulario.
 *
 * De momento solo vamos a persistir con seguridad:
 *  - typeId, brandId, modelId, currentHotelId, serial, …
 *  - y, cuando el modelo Asset lo tenga, los campos de
 *    overThreeYears / invoice* a través del service.
 *
 * Los campos de specs (CPU/RAM/disco/SO) se validan aquí pero
 * se mapearán en el service cuando las columnas estén listas.
 */
export const InventoryAssetDTO = z.object({
  // Datos generales
  typeId: z.number().int().positive(),
  brandId: z.number().int().positive().nullable().optional(),
  modelId: z.number().int().positive().nullable().optional(),
  currentHotelId: z.number().int().positive(),
  serial: z.string().min(1),

  // Datos del equipo (solo CPUs/Laptops) – opcionales a nivel DTO
  processorId: z.number().int().positive().nullable().optional(),
  ramModuleId: z.number().int().positive().nullable().optional(),
  diskTypeId: z.number().int().positive().nullable().optional(),
  storageCapacityId: z.number().int().positive().nullable().optional(),
  operatingSystemId: z.number().int().positive().nullable().optional(),

  // Facturación / antigüedad
  olderThan3Years: z.boolean().optional(),
  invoiceNumber: z.string().nullable().optional(),
  invoiceDate: z.string().nullable().optional(), // ISO string o null
  invoiceProviderId: z.number().int().positive().nullable().optional(),
});

export type InventoryAssetInput = z.infer<typeof InventoryAssetDTO>;
