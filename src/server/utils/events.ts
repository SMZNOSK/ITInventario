// src/server/utils/events.ts
// Bus de eventos simple + helper parseId

import { EventEmitter } from "events";

export type EventName = string;
export type EventPayload = unknown;
export type EventListener<T = EventPayload> = (payload: T) => void;

// ====== EventEmitter global ======
let emitter = new EventEmitter();
emitter.setMaxListeners(50);

export function setEmitter(next?: EventEmitter) {
  emitter = next ?? new EventEmitter();
  emitter.setMaxListeners(50);
}

function getEmitter() {
  return emitter;
}

// ====== Emisión de eventos ======

/**
 * API nueva: emitir un evento con un payload opcional.
 */
export function emitEvent<T = EventPayload>(event: EventName, payload?: T): void {
  getEmitter().emit(event, payload);
}

/**
 * 🔁 Alias de compatibilidad:
 * antes se hacía `import { emit } from "@/server/utils/events"`.
 * Aquí lo dejamos apuntando a `emitEvent` para no romper nada.
 */
export const emit = emitEvent;

// ====== Suscripción ======

export function subscribeEvent<T = EventPayload>(
  event: EventName,
  listener: EventListener<T>,
): () => void {
  getEmitter().on(event, listener as any);
  return () => {
    getEmitter().off(event, listener as any);
  };
}

// Alias corto opcional
export const subscribe = subscribeEvent;

// ====== Helper parseId usado en rutas dinámicas ======

/**
 * Convierte params.id (string | string[]) en number y valida que sea > 0.
 * Lanza "id inválido" si no es un ID numérico válido.
 */
export function parseId(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("id inválido");
  }

  return id;
}
