# Problema: No se puede eliminar préstamo marcado como devuelto

## Reporte del Usuario
El usuario reporta que no puede eliminar un préstamo que ya fue marcado como devuelto. Al intentar eliminarlo, recibe el error:

> **Error:** "Solo puedes eliminar préstamos ya devueltos."

## Causa Raíz Identificada

El problema tiene **dos causas**:

### 1. Validación incorrecta en DELETE endpoint
El endpoint `/api/loans/[id]/route.ts` (DELETE) estaba validando contra `endDate` (fecha programada de fin del préstamo) en lugar de `returnDate` (fecha real de devolución):

```typescript
// ❌ INCORRECTO - validaba endDate
const endMs = loan.endDate?.getTime?.() ?? NaN;
if (!Number.isFinite(endMs) || endMs > now + 1000) {
  return toNoStoreJson({ error: "Solo puedes eliminar préstamos ya devueltos." }, 409);
}
```

Esto causaba que:
- Un préstamo podía tener `returnDate` configurado (marcado como devuelto en la UI)
- Pero si `endDate` estaba en el futuro, no se podía eliminar
- El error no era claro sobre cuál era la validación real

### 2. Activo permanece en estado "ASIGNADO"
El activo con serial `12345GHJKK` está marcado como "ASIGNADO" cuando debería estar en "ALTA" después de la devolución.

## Solución Implementada

### Corrección del DELETE endpoint

Se actualizó la validación para verificar `returnDate` en lugar de `endDate`:

```typescript
// ✅ CORRECTO - valida returnDate
const loan = await prisma.loan.findUnique({
  where: { id },
  select: { 
    id: true, 
    endDate: true, 
    returnDate: true,  // ← Ahora se incluye
    teamName: true, 
    deviceName: true, 
    hotelId: true 
  },
});

if (!loan.returnDate) {
  return toNoStoreJson({ 
    error: "Solo puedes eliminar préstamos ya devueltos. Marca el equipo como devuelto primero." 
    }, 409);
}
```

## Próximos Pasos

1. **Corregir el estado del activo:** Usar la herramienta admin `/admin/check-asset-status` para verificar y corregir el estado del activo `12345GHJKK`
2. **Verificar otros activos:** Revisar si hay más activos con estados inconsistentes
3. **Probar la eliminación:** Después de corregir el estado, intentar eliminar el préstamo nuevamente
