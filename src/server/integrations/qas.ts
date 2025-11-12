// src/server/integrations/qas.ts
import "server-only";
import axios from "axios";
import { env } from "@/server/env";

const api = env.PS_QAS_BASE
  ? axios.create({
      baseURL: env.PS_QAS_BASE, // p.ej. https://psft.company.com/PSIGW/RESTListeningConnector
      timeout: 10000,
      headers: env.PS_QAS_TOKEN ? { Authorization: `Bearer ${env.PS_QAS_TOKEN}` } : undefined,
    })
  : null;

// Ejemplo: buscar colaborador por EMPID (ajusta nombres de query/params a tu QAS)
export async function qasFindCollaboratorById(emplid: string) {
  if (!api) return { ok: false as const, reason: "QAS not configured" };
  const path = `/QueryService.v1/BC_COLLAB_BY_ID`; // ajusta a tu instancia
  const res = await api.get(path, { params: { EMPLID: emplid } });
  return { ok: true as const, data: res.data };
}

// Otro ejemplo: catálogo de centros de costo
export async function qasListCostCenters() {
  if (!api) return { ok: false as const, reason: "QAS not configured" };
  const res = await api.get(`/QueryService.v1/BC_COST_CENTERS`);
  return { ok: true as const, data: res.data };
}
