-- Script para diagnosticar y corregir sincronización entre préstamos y activos
-- Problema: Préstamos marcados como devueltos (endDate < now) pero activos aún en estado ASIGNADO

-- ========================================
-- 1. DIAGNÓSTICO: Encontrar préstamos devueltos con activos mal sincronizados
-- ========================================

SELECT 
  l.id AS loan_id,
  l."collaboratorId",
  l."collaboratorName",
  l."teamName",
  l."deviceName",
  l."startDate",
  l."endDate",
  l."endDate" < NOW() AS is_returned,
  a.id AS asset_id,
  a.serial AS asset_serial,
  a.status AS asset_status,
  CASE 
    WHEN a.status = 'ASIGNADO' AND l."endDate" < NOW() THEN '⚠️ INCONSISTENTE'
    WHEN a.status = 'ALTA' AND l."endDate" < NOW() THEN '✅ OK'
    WHEN a.status = 'ASIGNADO' AND l."endDate" >= NOW() THEN '✅ OK'
    ELSE '❓ OTRO'
  END AS sync_status
FROM "Loan" l
LEFT JOIN "Equipment" a ON (
  -- Intentar encontrar el activo por serial extraído de teamName o deviceName
  a.serial = SUBSTRING(l."deviceName" FROM 'S/N:?\s*([A-Za-z0-9-]+)') 
  OR a.serial = SUBSTRING(l."teamName" FROM 'S/N:?\s*([A-Za-z0-9-]+)')
  OR a.serial = SUBSTRING(l."deviceName" FROM '·\s*([A-Z0-9]{8,})')
  OR a.serial = SUBSTRING(l."teamName" FROM '·\s*([A-Z0-9]{8,})')
)
WHERE l."endDate" < NOW()  -- Solo préstamos que deberían estar devueltos
ORDER BY sync_status DESC, l."endDate" DESC;

-- ========================================
-- 2. CORRECCIÓN: Actualizar activos a ALTA si el préstamo está devuelto
-- ========================================

-- NOTA: Este UPDATE debe ejecutarse con precaución
-- Solo descomentar y ejecutar después de revisar los resultados del diagnóstico

-- UPDATE "Equipment" a
-- SET status = 'ALTA'
-- WHERE a.status = 'ASIGNADO'
--   AND EXISTS (
--     SELECT 1 FROM "Loan" l
--     WHERE l."endDate" < NOW()
--       AND (
--         a.serial = SUBSTRING(l."deviceName" FROM 'S/N:?\s*([A-Za-z0-9-]+)')
--         OR a.serial = SUBSTRING(l."teamName" FROM 'S/N:?\s*([A-Za-z0-9-]+)')
--         OR a.serial = SUBSTRING(l."deviceName" FROM '·\s*([A-Z0-9]{8,})')
--         OR a.serial = SUBSTRING(l."teamName" FROM '·\s*([A-Z0-9]{8,})')
--       )
--   );

-- ========================================
-- 3. VERIFICACIÓN: Contar préstamos con problemas de sincronización
-- ========================================

SELECT 
  COUNT(*) AS total_returned_loans,
  COUNT(CASE WHEN a.status = 'ASIGNADO' THEN 1 END) AS assets_still_assigned,
  COUNT(CASE WHEN a.status = 'ALTA' THEN 1 END) AS assets_properly_returned,
  COUNT(CASE WHEN a.id IS NULL THEN 1 END) AS assets_not_found
FROM "Loan" l
LEFT JOIN "Equipment" a ON (
  a.serial = SUBSTRING(l."deviceName" FROM 'S/N:?\s*([A-Za-z0-9-]+)') 
  OR a.serial = SUBSTRING(l."teamName" FROM 'S/N:?\s*([A-Za-z0-9-]+)')
  OR a.serial = SUBSTRING(l."deviceName" FROM '·\s*([A-Z0-9]{8,})')
  OR a.serial = SUBSTRING(l."teamName" FROM '·\s*([A-Z0-9]{8,})')
)
WHERE l."endDate" < NOW();
