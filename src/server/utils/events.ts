// src/server/utils/events.ts
import "server-only";

// Pequeño hook para publicar eventos (no-op por defecto).
// Si integras Socket.IO/Pusher/etc., reemplaza setEmitter() en tu bootstrap.
type Emitter = (event: string, payload: any) => void;

let _emitter: Emitter | null = null;

export function setEmitter(fn: Emitter) {
  _emitter = fn;
}

export function emit(event: string, payload: any) {
  try { _emitter?.(event, payload); } catch {}
}
