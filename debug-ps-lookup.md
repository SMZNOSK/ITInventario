# Debug PeopleSoft Collaborator Lookup

## Problema
- Usuario eliminó el registro local del colaborador `098075`
- Al intentar buscarlo de nuevo desde PeopleSoft, se muestra error "Colaborador no encontrado"
- Error: `http://localhost:3000/api/collaborators/098075` retorna 404

## Posibles Causas
- [ ] PeopleSoft no tiene datos para este EMPLID
- [ ] Parser no está extrayendo correctamente los datos de la respuesta
- [ ] Problema de conectividad con PeopleSoft
- [ ] Variable de ambiente PS_ENABLE no está configurada

## Tareas
- [ ] Verificar logs del servidor para ver respuesta de PeopleSoft
- [ ] Activar modo desarrollo para ver estructura XML/JSON
- [ ] Verificar que PS_ENABLE=1 en .env
- [ ] Probar con otro colaborador conocido
