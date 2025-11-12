// src/server/modules/collaborators/service.ts
import "server-only";
// import { prisma } from "@/lib/db";
import type {
  CreateCollaboratorInput,
  UpdateCollaboratorInput,
} from "@/server/dto/collaborators";

type Collaborator = {
  id: string;
  numColaborador: string;
  nombre: string;
  departamento?: string;
  email?: string;
};

const DUMMY_COLLABORATORS: Collaborator[] = [
  {
    id: "123456",
    numColaborador: "123456",
    nombre: "Juan Pérez",
    departamento: "Sistemas",
    email: "juan.perez@example.com",
  },
  {
    id: "789012",
    numColaborador: "789012",
    nombre: "María López",
    departamento: "Recursos Humanos",
    email: "maria.lopez@example.com",
  },
];

export async function list() {
  // Futuro: reemplazar por prisma o QAS
  return DUMMY_COLLABORATORS;
}

export async function create(_data: CreateCollaboratorInput) {
  // Futuro: decide si persistes local o solo integras PS/QAS
  throw new Error("create collaborator: not implemented yet");
}

export async function get(id: string) {
  return DUMMY_COLLABORATORS.find((c) => c.id === id) ?? null;
}

export async function update(id: string, data: UpdateCollaboratorInput) {
  const existing = DUMMY_COLLABORATORS.find((c) => c.id === id);
  if (!existing) return null;
  return { ...existing, ...data };
}
