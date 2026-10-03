# Detalle y fecha de vencimiento

## Persistencia y preparación

La migración `1791045000000_add_task_due_date` añade solo `tasks.due_date`, texto
nullable de día civil `YYYY-MM-DD`. Las tareas anteriores quedan sin fecha y
conservan sus otros campos. No hay revisión, trigger ni historial. El rollback
elimina la columna y pierde las fechas; conservar copia antes de revertir si se
necesitan. Revertir primero los clientes/endpoints que dependen de ella.

Desde `backend/`, ejecutar `node ace migration:run` antes de utilizar el detalle.
Bootear el servidor o generar tipos no sustituye esta preparación. El esquema
se genera mediante CLI, nunca se edita manualmente.

Las pruebas usan `tmp/db.test.sqlite3`, independiente de `tmp/db.sqlite3` de
desarrollo. Ejecutar `PORT=3334 npm test` si el servidor normal ocupa 3333.
No ejecutar dos procesos de pruebas sobre la misma base a la vez.

## Evidencia de persistencia

- Japa `task_date_persistence.spec.ts`: migración real sobre conexión SQLite
  aislada con fila previa, null inicial, conservación y rollback; persistencia
  de fecha/null frente a fixtures de estado y responsable. 2/2 correctas.
- Las migraciones de pruebas se revierten al cerrar la suite. No se trunca
  desarrollo ni se crean endpoints para estado, reasignación o borrado.

## API y concurrencia

Todas las rutas exigen Bearer válido. GET `/api/v1/tasks/:id` consulta cualquier
tarea, incluido Hecho, propia o ajena. Devuelve `200 { data: detail }` con
`id`, `title`, `status`, `createdAt`, `assignee: { fullName }` y `dueDate`.
POST y colección mantienen exactamente su representación anterior sin fecha.
El delta amplía `tareas-compartidas`; conserva los tres escenarios originales
del contrato. No crea una capability ni sincroniza todavía las living specs.

PATCH `/api/v1/tasks/:id/due-date` recibe, por ejemplo:

```json
{"dueDate":"2026-10-04","expectedDueDate":null,"expectedStatus":"pending"}
```

Las tres claves son obligatorias. Retirar requiere `dueDate: null`, no `""`.
Fecha civil gregoriana canónica, años 0001–9999, sin restricción de fecha pasada.
Campos adicionales se ignoran. Solo se escribe due_date; no cambia título,
responsable, estado ni timestamps originales. El éxito devuelve el detalle
confirmado. 401: autenticación; 404: identificador inválido/inexistente; 422:
errores por campo. 409 devuelve `TASK_CONFLICT` y aviso, sin snapshot aplicado.

Un UPDATE condicional compara fecha null-safe y estado dentro de transacción,
como primera sentencia. Cero filas y existencia determinan 409/404. La conexión
usa un escritor por proceso y espera SQLite acotada de 5 segundos para otros
procesos, evitando upgrade de bloqueo tras una lectura previa. No-op no invalida
la referencia; un cambio revertido al valor consultado no se detecta (sin ABA).
Si se pierde la respuesta tras persistir, no se promete que no se escribió ni
exactly-once: consultar manualmente o reintentar puede revelar conflicto.

Japa `task_detail.spec.ts`: 25 casos correctos de contrato, privacidad, tres
estados, dos personas, límites/errores, campos requeridos, no-op y referencias.
`task_date_race.spec.ts`: tres carreras HTTP entre dos procesos/conexiones reales
con fixtures committed fuera de transacción global; cada carrera exige 200/409,
verifica el ganador persistido y limpia servidor/fixtures. SQLITE_BUSY/500 no
se acepta como conflicto. Los ejemplos de payload se ejercitan en esas pruebas.

## Calendario y pruebas permanentes

Desde `frontend/`, `npm test` ejecuta tests versionados con node:test y
node:assert/strict (Node 24 o superior con TypeScript nativo, sin runner añadido).
Importan el mismo `src/lib/task-calendar.ts` utilizado por el detalle.
Cubren ayer/hoy/mañana/null, tres estados, dos días locales, avance del día,
fecha inmutable y medianoches DST de 23/25 horas. 5/5 correctos.

La regla se ubica en dominio frontend: allí reside el día de quien mira; adapta
el reparto backend propuesto en FS-118.2. No hay flag persistido ni regla
duplicada en API. La pantalla compara solo snapshot confirmado, nunca borrador.
Se obtiene el día por componentes locales, sin parsear fechas civiles como UTC.
Focus, visibilitychange y pageshow recalculan calendario sin fetch. Un timer
alcanza la próxima medianoche civil, no un intervalo fijo de 24 horas, y se
limpia junto a los listeners al desmontar.

## Interacción y límites

Página protegida `/tasks/:id`, elegida por delegación para simplificar enlaces
directos y teclado. Título, responsable y estado son de consulta; fecha es el
único editor. Input nativo, formato/rango 0001–9999 y 404 con aviso/regreso son
decisiones menores delegadas, revisables posteriormente, no requisitos
atribuibles al PRD. «Quitar fecha» solo vacía el borrador; requiere Guardar y no
añade confirmación extra. «Descartar edición» adopta el último snapshot sin
escribir ni salir. Fecha guardada y edición se presentan por separado.

Guardado explícito sustituye el autosave de CA-16. Durante PATCH se bloquean
edición, segundo envío y salida interna/POP. Una salida intentada se cancela:
no se ejecuta automáticamente al terminar el guardado. Tras resolver se aplica
confirmación solo si quedan cambios. El diálogo nativo modal permite Permanecer,
Escape o Salir sin guardar, restaura foco y no envía PATCH. Beforeunload advierte
si dirty o saving; requiere soporte/gesto del navegador, no garantiza impedir
cierre forzado ni pérdida real de sesión. Un envío ya emitido puede persistir.

Tras 409, Guardar queda bloqueado hasta Consultar cambios exitoso. GET conserva
borrador, sustituye snapshot y referencia y no escribe; si coincide, dirty queda
limpio. Si no, puede descartarse o guardarse explícitamente con nueva referencia.
Errores 422/red/5xx no confirman éxito ni reintentan automáticamente. 404 durante
edición conserva texto visible pero bloquea guardado. Respuestas tardías se
descartan por generación/desmontaje; cambio de tarea/token remonta el editor.
Un 401 retira la sesión protegida mediante el mecanismo existente de logout.

## Evidencia de navegador y matriz del delta

Chromium headless ejecutado con Playwright del entorno temporal existente,
sin dependencias o runner nuevos en el proyecto. Script y resultado:
`/tmp/opencode/flowsync-playwright/detail.mjs` y `detail-results.json`.
API NODE_ENV=test en 3334; Vite 5174 y proxy same-origin 5175 (CORS en entorno
test no habilita orígenes de desarrollo). No se cambia la configuración CORS.
No ejecutar Japa simultáneamente con este servidor sobre la misma base.
Los fixtures tienen emails identificables, se eliminan por sus IDs al finalizar
y los servidores temporales se detienen antes del pase final.

15/15 grupos de comprobaciones correctos, sin errores JavaScript no capturados:

| Requisito/escenarios del delta | Evidencia |
| --- | --- |
| Detalle mínimo: abrir/volver, ajena/Hecho, nombre nulo, anónimo | Japa detalle + teclado, deep link Hecho y guard de navegador |
| Alta/lista preservadas y fecha opcional | Japa creación/colección + navegador alta con un input, lista sin fechas/marcas, Hecho excluido, sin fecha neutral |
| Fecha válida/pasada/entre husos | Japa límites, calendario gregoriano y errores; navegador Tokio/Nueva York conserva mismo día; tres estados en Japa |
| Edición separada, éxito, envío pendiente | PATCH real y payload/Bearer; editar/quitar no escribe ni cambia señal; éxito local, controles pendientes y envío único |
| Descarte interno, back/forward y salida navegador | diálogo con foco/Escape/Permanecer/descarte; POP atrás/adelante; beforeunload con borrador; bloqueo POP durante PATCH |
| Vencimiento: bordes, dos días, medianoche/suspensión, estado actualizado | node:test permanente + reloj/husos Chromium; focus/visibility/pageshow preservan borrador y contadores GET/PATCH, DST 23h, Hecho recuperado sin señal |
| Conflictos por fecha/estado, dos ganadores posibles | Japa CAS y carrera real entre procesos 200/409; dos editores en navegador y fixture de estado |
| Recuperación, descarte, fallo/nuevo conflicto | navegador GET manual sin PATCH, fallo de consulta, conflicto repetido, descartar snapshot y borrador igual al recuperado |
| Fallo guardado/respuesta tardía | 422 inline, red/500 con snapshot/borrador y aviso salida; respuesta perdida después de escribir, reintento 409; GET tardío y PATCH tras reemplazo forzado de documento/sesión |
| Contrato público y referencias requeridas | Japa 200/201/401/404/409/422, claves, privacidad, adicionales ignorados; frontend 404 inicial sin editor, retry inicial hidrata fecha y 404 durante edición conserva texto |
| Compatibilidad de cuentas-y-acceso | Japa auth + registro/login UI a profile, rehidratación, logout/back guards en profile/tasks/detalle |

Negativos de alcance: un solo editor de fecha, ningún control de edición de
título/responsable/estado, filtro, borrado, notificaciones o preferencia de zona.
Japa conserva 404 para PATCH genérico y DELETE. Cambio de estado, reasignación
y acceso desde filtro de Hecho siguen como integraciones futuras pendientes:
los fixtures no las implementan ni completan FS-118.5.

Regresión del incremento anterior: 15/15 grupos Chromium de alta/lista/auth,
ejecutados con `regression-detail.mjs` (adaptación de selectores: los títulos
ahora son enlaces, única diferencia de UI aprobada). Conserva checks de título
exacto/Unicode/255 unidades, errores, orden local, dos responsables, privacidad,
sin frescura automática y respuestas tardías. Resultado temporal `results.json`.

## Smoke test del entorno normal

Migración aplicada mediante `node ace migration:run` sobre
`backend/tmp/db.sqlite3`; se comprobó la columna due_date real y su entrada
en adonis_schema. Servidor habitual `localhost:3333` y frontend habitual
`localhost:5173`, sin reutilizar API ni base de tests. El usuario autorizó un
token temporal para una cuenta ya existente; creado con el proveedor Adonis,
revocado al finalizar y eliminado el fichero temporal que lo contenía.

Chromium comprobó con cuenta existente y cuenta nueva identificable: alta con
solo título, lista, abrir detalle, guardar fecha, recargar/rehidratar, comprobar
valor en el fichero SQLite normal, retirar y comprobar null, volver a lista
sin marcas ni fechas y logout. Ambas jornadas correctas, sin errores JS.
Fixtures de tareas/cuenta nueva retirados; comparadas todas las filas originales
de tareas y datos públicos de usuarios antes/después: conservadas íntegramente.
No se trunca desarrollo ni se modifica una tarea original.
Evidencia temporal: `dev-smoke.mjs` y `dev-smoke-results.json`.

## Checks finales

- Backend: `PORT=3334 npm test` **56/56**, `npm run lint` y
  `npm run typecheck` correctos. Incluye las 28 pruebas anteriores.
- Frontend: `npm test` **5/5**, `npm run build` (typecheck incluido) y
  `npm run lint` correctos. No se añaden dependencias de tests ni calendario.
- Navegador: **15/15** grupos de detalle + **15/15** de regresión anterior;
  smoke normal con ambas cuentas correcto.
- `git diff --check` y
  `openspec validate detalle-y-fecha-de-vencimiento --strict` correctos.
- Registros y esquema regenerados por boot/tests/CLI y revisados: consulta y
  PATCH individual, dueDate nullable, colección anterior sin fecha; rutas.json
  es también una salida del generador de rutas de Adonis en desarrollo.
- Servidores temporales detenidos; fixtures de regresión retirados mediante
  rollback exclusivamente en la base de tests antes del pase final de Japa.
  Migración normal permanece aplicada; no se reinicia ni trunca desarrollo.
- Solo se implementan detalle/fecha y mecanismos exigidos por sus acuerdos;
  se preservan los cambios previos sin commit. Cambio no archivado ni living
  specs sincronizadas automáticamente; no se hace commit ni push.
