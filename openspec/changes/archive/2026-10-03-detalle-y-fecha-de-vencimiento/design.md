# Design

## Context

Ver `proposal.md` para motivación, fuentes y acuerdos. El cambio cruza persistencia, API, navegación, calendario y concurrencia; requiere diseño previo. Actualmente Task extiende TaskSchema generado y solo declara assignee; TasksController tiene store/index; el transformer de colección expone cinco campos sin fecha. Las rutas de tareas solo crean y listan. Japa migra `tmp/db.test.sqlite3` y usa transacciones por test. React Router 8 usa BrowserRouter + Routes; no hay runner frontend instalado.

La prueba funcional que exige 404 para detalle deberá evolucionar, manteniendo las aserciones de ausencia de modificación genérica y borrado. La base normal requiere migración explícita: el defecto anterior de «no such table: tasks» demostró que boot, registros generados y pruebas aisladas no acreditan un entorno listo.

## Goals / Non-Goals

**Goals:** fecha civil estable entre husos, una única función de vencimiento, actualización condicional atómica, separación snapshot/borrador y cobertura reproducible del entorno objetivo.

**Non-Goals:** servidor que decide un vencimiento global, reloj o timezone persistidos por usuario, tabla de historial, idempotencia de ejecución exactamente una vez o infraestructura de eventos. Las exclusiones de producto están en la propuesta.

## Decisions

### 1. Persistencia y comparación de valores

Añadir únicamente `due_date` nullable como texto canónico `YYYY-MM-DD`. Las filas anteriores conservan sus datos y nacen sin fecha. Crear migración Lucid, generar el esquema con CLI y mantener modelos sin columnas manuscritas. Validación gregoriana estricta en API para días reales entre 0001 y 9999: convención menor elegida por delegación para interoperar con input de fecha y evitar timestamps/rollover, revisable posteriormente. No min=today ni normalización de entrada inválida.

El cliente conserva fecha y estado consultados. PATCH compara esos valores con los actuales mediante condición null-safe y actualiza solo si coinciden. No hay columna version, trigger, histórico ni garantía ABA. Si un valor cambia y vuelve al original, la comparación no detecta ese historial y puede aceptar el guardado: limitación expresamente elegida en revisión. Cambios de título/responsable no generan conflicto.

Alternativas descartadas: revisión monotónica/trigger añadirían la garantía ABA que el usuario excluyó; updatedAt ampliaría conflictos a otras columnas y depende de precisión temporal. Comparar valores es el mecanismo mínimo para el comportamiento confirmado.

### 2. API individual separada

Contrato detallado en el delta de `tareas-compartidas`: GET individual `tasks.show` y PATCH de fecha `tasks.updateDueDate`. Detail reutiliza campos públicos de colección y agrega únicamente `dueDate: string | null`; la colección y POST conservan su transformer/contrato. GET admite Hecho por identificador, decisión confirmada; no se agrega filtro. No agregar un isOverdue calculado con día del servidor.

PATCH requiere `dueDate` nullable, `expectedDueDate` nullable en el mismo formato y `expectedStatus` de los tres estados. Validar componentes y años bisiestos sin timestamp UTC ni rollover. Usar vine.create, subpath imports, serializer y transformer individual. Mantener parsing canónico sin trim en esa ruta y comportamiento original de auth/títulos. Campos inválidos/ausentes dan 422 por campo; no convertir ausencia de expectedDueDate en null. Ruta/ID inválidos o tarea ausente: 404, convención menor delegada para informar inexistencia sin detalle ficticio.

Dentro de transacción usar un único UPDATE con WHERE id, fecha esperada null-safe (whereNull si corresponde) y estado esperado. No hacer lectura/comparación seguida de escritura incondicional. Cero filas: consultar existencia distingue 404/409; leer detalle dentro de la misma transacción tras éxito. Dos fechas propuestas distintas desde una referencia idéntica, ambas diferentes del valor previo, deben producir 200/409. Un no-op no cambia referencia ni obliga a invalidarla.

SQLite serializa escrituras: configurar espera acotada de bloqueo en la conexión para que la segunda escritura evalúe el WHERE después de la primera. No abrir transacción diferida con lectura previa que provoque upgrade busy; el UPDATE es la primera operación de la transacción. Verificar simultaneidad con conexiones independientes, fuera de la transacción global de tests. Un SQLITE_BUSY no cuenta como conflicto ni acredita la carrera 200/409; si la prueba no consigue esa garantía, resolver el mecanismo antes de completar la tarea. Otros fallos de servidor se comunican como fallo recuperable, nunca éxito falso.

409 usa error sin envoltorio, con código TASK_CONFLICT y aviso castellano. No aplicar automáticamente un snapshot del error: GET explícito obtiene fecha/estado actuales. Si se pierde una respuesta tras persistir, la referencia previa detectará diferencias en el siguiente intento salvo que los valores coincidan otra vez. No prometer exactly-once ni ABA.

### 3. Un evaluador de calendario, local y puro

Ubicar la función de dominio de vencimiento en un módulo puro frontend (`src/lib/task-calendar.ts`), independiente de React: recibe dueDate, status y día civil de referencia; devuelve boolean. La pantalla es la única capa que obtiene ese día del dispositivo. Backend persiste fecha/estado y no duplica la regla ni acepta una afirmación de vencimiento del cliente. Esta localización concreta el DoD «regla en dominio» de FS-118.2 en el consumidor que posee el día local; sus checks de lint/typecheck se ejecutan allí.

Comparar strings canónicos de calendario, sin `new Date('YYYY-MM-DD')`. Obtener el día con componentes locales; no `toISOString().slice(0,10)` (sería UTC). Programar reevaluación hasta la siguiente medianoche local calculada con calendario, no +24h (DST), y reevaluar en focus/visibilitychange/pageshow. Al volver de suspensión recalcular día y siguiente temporizador; limpiar listeners/timer al desmontar. No fetch en estos callbacks.

Cobertura permanente: tests de la función pura en `frontend/tests/task-calendar.test.ts` con `node:test` y `node:assert/strict`, ejecutados por `npm test` desde frontend usando el soporte TypeScript nativo de Node 24 ya utilizado en el entorno. Módulo sin alias React/Vite ni sintaxis TS que requiera transformación; los tests importan el mismo módulo usado por UI. No añadir dependencia de runner. Probar días inyectados, tres estados, null, igualdad, cambio de día, dos referencias y conservación de fecha. Pruebas complementarias de navegador con timezone/reloj controlados cubren medianoche, suspensión y DST, pero no sustituyen los tests versionados. Esto adapta el reparto backend de FS-118.2: la regla vive en dominio frontend porque allí reside el día local; la discrepancia y su comando permanente quedan documentados.

### 4. Detalle como página y protección de navegación

Decisión menor delegada: página `/tasks/:id` protegida con enlace semántico desde filas y regreso. Es la opción sencilla para URL directa, teclado y consulta Hecho. Input nativo sin nuevos paquetes; «Quitar fecha» solo vacía borrador y exige Guardar, sin confirmación adicional por retirada reversible. «Descartar edición» restaura la fecha del último snapshot sin escribir ni salir: acción sencilla para decidir tras recuperar un conflicto. Campo vacío neutral; presentar snapshot aparte del borrador cuando difieran. Preservar estado parcial/badInput para no convertir fecha incompleta en retirada; traducción `'' -> null` solo para un campo realmente vacío válido. No editar componentes generados.

BrowserRouter declarativo no da contexto de data router para useBlocker: migrar contenedor a createBrowserRouter/RouterProvider conservando rutas/guards y AuthProvider. Mientras guarda, deshabilitar salida por controles y bloquear navegación interna/POP sin opción de descartar; al terminar se vuelve a evaluar dirty. Sin envío pendiente, useBlocker ofrece permanecer/descartar si dirty. No interceptar history manualmente. beforeunload se registra si dirty o saving: aviso nativo para recarga/cierre, con gesto previo y texto impuesto; no se puede garantizar impedir cierre forzado. La pérdida real de sesión prevalece sobre el bloqueo, no se retiene contenido protegido.

Alternativas: panel/modal también posible pero agrega cierre y rutas de fondo; una página simplifica deep links y Hecho por ID. Instalar un framework de formularios no se justifica para un campo. El cambio de router es técnico, exige regresiones de auth y no cambia destinos /profile.

### 5. Máquina de estado de edición

Snapshot `{id, dueDate, status, ...}`, borrador raw, carga/error, saving y conflicto. dirty compara borrador y fecha del último snapshot e incluye entrada inválida. Capturar tarea/token/generación en peticiones, ignorar resoluciones viejas y cancelar GET cuando sea posible. Guardar captura fecha/estado de referencia y borrador; bloquea edición, nuevos envíos y salida hasta resolver. No ofrecer «descartar sin persistir» un PATCH ya enviado.

Tras 200 sincronizar snapshot/borrador, recalcular etiqueta y limpiar dirty. Tras 422 o red/5xx conservar ambos y permitir corrección/reintento manual con aviso correspondiente; salida vuelve a tener confirmación de descarte. 409 bloquea Guardar hasta GET «Consultar cambios» exitoso: cambia snapshot y referencia esperada, conserva borrador. «Descartar edición» copia snapshot al borrador, limpia dirty y no hace PATCH; si el valor recuperado ya coincide, no hay cambios pendientes. No consulta/guardado automático ni sobrescritura forzada; otro conflicto repite el ciclo.

```
cargando --> listo --> editando --> guardando --> listo
               ^          ^            |
               |          +-- error ---+
               |                       |
               +-- consulta <-- conflicto
                   explicita   (borrador conservado)
```

Consulta inicial fallida bloquea editor y ofrece reintento manual; 404 muestra «La tarea no existe» y regreso, sin detalle vacío. 404 durante edición conserva texto visible para evitar pérdida pero deshabilita Guardar y permite salir con descarte; no incorporar borrado a la API. Este manejo de inexistencia es una convención de error para un recurso, no aprobación del borrado futuro.

### 6. Verificación y trazabilidad

Mantener tests Japa existentes; actualizar solo la aserción de ausencia de GET individual, conservar PATCH genérico y DELETE inexistentes. Fixtures de Hecho/cambios de estado/reasignación usan DB y no agregan controles de producto. Cubrir regla y conservación de fecha sin declarar completas las historias pendientes. Demorar GET/PATCH y probar cambio de tarea/sesión, red, dos editores y navegación con dirty en navegador. Documentar matriz escenario/evidencia, diferencias con criterios propuestos y límites.

## Risks / Trade-offs

- [Perder cambios por cierre de proceso] --> beforeunload ofrece advertencia cuando es posible; no persistir borradores localmente ni garantizar cierres forzados.
- [Snapshot de estado ajeno obsoleto] --> calendario recalcula sobre último valor confirmado; consulta inicial/manual o conflicto obtiene nuevos datos. No prometer frescura de E3-2.
- [Zona del dispositivo errónea] --> usar la configuración acordada, sin preferencias nuevas.
- [Cambios intermedios revertidos no detectados] --> limitación elegida: comparar solo valores actuales, no añadir revisión/trigger ni prometer ABA.
- [Router cambia infraestructura de auth] --> pruebas de restauración, navegación anónima, registro/login y logout; no modificar requisitos de acceso.
- [API y schema listos pero BD normal sin migrar] --> checklist de despliegue y smoke test autenticado en el backend normal, con evidencia de fichero y migración.
- [Respuesta perdida tras escribir] --> no afirmar que no se persistió; la recuperación por consulta/CAS protege la siguiente decisión.

## Migration Plan

1. Verificar migración/rollback en base aislada con tareas previas, columnas existentes conservadas y fecha null inicial. Rollback elimina solo due_date y pierde las fechas: conservar copia si se necesitan.
2. Regenerar schema por CLI y registros por boot/tests. Migrar entorno objetivo antes de desplegar UI y registrar fichero, migración y columna efectiva; no exigir trigger o versión.
3. Desplegar endpoints y UI; smoke test en localhost:3333 y frontend normal, con cuenta existente/nueva, consulta individual y guardado. No dar por listo basándose solo en NODE_ENV=test. Cualquier escritura de demo debe ser identificable y autorizada; no truncar desarrollo.
4. Ejecutar checks por subproyecto y validación estricta; registrar cobertura. Revertir UI/endpoints antes de rollback de columnas; no dejar clientes que escriban sobre esquema revertido.

## Open Questions

Solo copy secundario/composición pueden ajustarse sin cambiar comportamiento. Decisiones menores elegidas por delegación y sujetas a revisión posterior: página directa (menos estado de modal), input nativo y rango/formato (sin parser flexible ni paquete de calendario), Quitar + Guardar (coherente con guardado explícito), Descartar edición (adopta snapshot sin perder contexto) y 404 con aviso/regreso (recurso inexistente no se inventa). Las rutas y payloads son convenciones técnicas. Consulta de Hecho, concurrencia sin ABA, salida bloqueada y tests permanentes son decisiones explícitas del usuario, no supuestos. PA-7 y PA-8 para futuras ediciones, filtros y frescura siguen fuera.
