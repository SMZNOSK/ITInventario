-- Cambiar status de ASIGNADO a ALTA para los dos equipos
UPDATE "Equipment"
SET status = 'ALTA'
WHERE serial IN ('POIUHGVBN9', 'POIUHGVB10')
  AND status = 'ASIGNADO';

-- Actualizar préstamos para marcarlos como devueltos
UPDATE "Loan"
SET "endDate" = NOW()
WHERE ("deviceName" ILIKE '%POIUHGVBN9%' 
    OR "teamName" ILIKE '%POIUHGVBN9%'
    OR "deviceName" ILIKE '%POIUHGVB10%' 
    OR "teamName" ILIKE '%POIUHGVB10%')
  AND "endDate" > NOW();

-- Verificar los cambios
SELECT serial, status, "currentHotelId" 
FROM "Equipment" 
WHERE serial IN ('POIUHGVBN9', 'POIUHGVB10');
