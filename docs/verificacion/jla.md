# Verificación — Lo que cada tarea muestra de su responsable

Scenarios: 3
Estimación previa: 0/3 cubiertos (soy de ver para creer por eso ese cero)

Scenarios cubiertos: 0

| Scenario | Test que lo cubre | Estado | Si no lo sé, qué falta |
|---|---|---|---|
| Responsable identificable: una tarea asignada a Ada Lovelace muestra su nombre e iniciales | | No cubierto | |
| La tarea no filtra datos de cuenta: el responsable no expone email ni otros datos de acceso o cuenta | | No cubierto | |
| Responsable sin nombre: muestra nombre nulo e iniciales sin exponer email | | No cubierto | |

## Parte B

1. Antes de mirar creía que había 0 escenarios cubiertos y resultaron estar cubiertos 0, pero cuando se hicieron los tests, pues ta channn, 2 pasaron.

2. En "La tarea no filtra datos de cuenta" aparecen los campos 'createdAt' y 'updatedAt pero la spec no dice nada sobre ellos, ni los prohíbe (como con el correo) ni  obliga a mostrarlos. Faltaría saber para que están o se usan.

3. Decidió usar el id cuando yo no le dije nada, demasiado ambiguo mi prompt :( o haberle dicho que cualquier decisión me la consultara previamente


