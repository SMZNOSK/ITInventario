-- Script para resetear returnDate de préstamos que fueron marcados incorrectamente como devueltos
-- pero sus activos siguen en estado ASIGNADO

-- Préstamos específicos del colaborador 391162 que tienen el problema
UPDATE "Loan"
SET "returnDate" = NULL
WHERE "collaboratorId" = '391162'
  AND "returnDate" IS NOT NULL
  AND (
    "deviceName" ILIKE '%POIUHGVB10%'
    OR "deviceName" ILIKE '%POIUHGVBN9%'
    OR "deviceName" ILIKE '%ASDFGHJ123%'
    OR "teamName" ILIKE '%POIUHGVB10%'
    OR "teamName" ILIKE '%POIUHGVBN9%'
    OR "teamName" ILIKE '%ASDFGHJ123%'
  );

-- Verificar los préstamos actualizados
SELECT 
  l.id,
  l."collaboratorId",
  l."collaboratorName",
  l."deviceName",
  l."teamName",
  l."returnDate",
  l."endDate"
FROM "Loan" l
WHERE l."collaboratorId" = '391162'
ORDER BY l.id;
