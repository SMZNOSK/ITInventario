-- Actualizar nombres de colaboradores en asignaciones existentes
-- Este script actualiza el campo collaboratorName en la tabla Assignment
-- usando el nombre real de la tabla Collaborator

UPDATE "Assignment" a
SET "collaboratorName" = c.name
FROM "Collaborator" c
WHERE a."collaboratorId" = c.id
  AND (a."collaboratorName" IS NULL OR a."collaboratorName" = a."collaboratorId");

-- Verificar cuántos registros fueron actualizados
SELECT 
  COUNT(*) as total_actualizados 
FROM "Assignment" a
INNER JOIN "Collaborator" c ON a."collaboratorId" = c.id
WHERE a."collaboratorName" = c.name;
