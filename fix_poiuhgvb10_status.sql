-- Script para diagnosticar y corregir el estado del equipo POIUHGVB10

-- 1. Ver el estado actual del equipo
SELECT 
  e.id,
  e.serial,
  e.status,
  e."currentHotelId",
  h.name as hotel_name,
  t.name as type_name,
  b.name as brand_name,
  m.name as model_name
FROM "Equipment" e
LEFT JOIN "Hotel" h ON h.id = e."currentHotelId"
LEFT JOIN "Type" t ON t.id = e."typeId"
LEFT JOIN "Brand" b ON b.id = e."brandId"
LEFT JOIN "Model" m ON m.id = e."modelId"
WHERE e.serial = 'POIUHGVB10';

-- 2. Verificar si tiene asignaciones activas (assignments regulares)
SELECT 
  a.id,
  a."assetId",
  a."collaboratorId",
  a."collaboratorName",
  a.status,
  a."assignedAt",
  a."returnedAt",
  c.name as collaborator_name_from_table
FROM "Assignment" a
LEFT JOIN "Collaborator" c ON c.id = a."collaboratorId"
WHERE a."assetId" IN (SELECT id FROM "Equipment" WHERE serial = 'POIUHGVB10')
ORDER BY a."assignedAt" DESC;

-- 3. Verificar si tiene asignaciones manuales activas
SELECT 
  ma.id,
  ma."assetId",
  ma."collaboratorName",
  ma."collaboratorEmail",
  ma.status,
  ma."assignedAt",
  ma."returnedAt"
FROM "ManualAssignment" ma
WHERE ma."assetId" IN (SELECT id FROM "Equipment" WHERE serial = 'POIUHGVB10')
ORDER BY ma."assignedAt" DESC;

-- 4. Verificar si tiene préstamos activos
SELECT 
  l.id,
  l."collaboratorId",
  l."collaboratorName",
  l."teamName",
  l."deviceName",
  l."startDate",
  l."endDate",
  l."returnDate"
FROM "Loan" l
WHERE l."deviceName" ILIKE '%POIUHGVB10%'
   OR l."teamName" ILIKE '%POIUHGVB10%'
ORDER BY l."startDate" DESC;

-- 5. Si NO tiene asignaciones activas ni préstamos activos, corregir a ALTA
-- SOLO EJECUTAR SI LOS QUERIES ANTERIORES CONFIRMAN QUE NO HAY ASIGNACIONES/PRÉSTAMOS ACTIVOS
/*
UPDATE "Equipment"
SET status = 'ALTA'
WHERE serial = 'POIUHGVB10'
  AND status = 'ASIGNADO'
  AND id NOT IN (
    -- Equipment con assignments activos
    SELECT DISTINCT a."assetId" 
    FROM "Assignment" a 
    WHERE a.status = 'ASIGNADO'
    UNION
    -- Equipment con manual assignments activos
    SELECT DISTINCT ma."assetId"
    FROM "ManualAssignment" ma
    WHERE ma.status = 'ASIGNADO'
  );
*/

-- 6. Verificar el cambio
SELECT serial, status FROM "Equipment" WHERE serial = 'POIUHGVB10';
