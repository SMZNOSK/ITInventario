// src/server/modules/brands/orchestrator.ts
import "server-only";
import * as svc from "./service";

export const BrandsOrchestrator = {
  list: () => svc.listMarcas(),
  create: (nombre: string) => svc.createMarca(nombre),
  update: (id: number, nombre: string) => svc.updateMarca(id, nombre),
  remove: (id: number) => svc.deleteMarca(id),
};
