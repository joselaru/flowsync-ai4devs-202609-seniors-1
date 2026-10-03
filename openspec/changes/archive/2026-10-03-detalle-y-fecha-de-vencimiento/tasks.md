# Tasks

## 1. Persistencia de fecha

- [x] 1.1 Añadir migración de due_date nullable sobre tareas existentes; verificar en SQLite aislado con filas previas conservación de título, responsable, estados y fechas originales, fecha inicialmente null y rollback limpio. Regenerar TaskSchema por CLI, sin introducir version ni trigger.
- [x] 1.2 Verificar persistencia fecha/null y que cambios de estado o responsable mediante fixtures no alteran la fecha; mantener pruebas permanentes Japa aisladas sin añadir endpoints o controles para esas ediciones.
- [x] 1.3 Documentar esquema y pérdida de fecha al revertir en docs/detalle-y-fecha-de-vencimiento.md; verificar comandos en base aislada y lint/typecheck backend, manteniendo desarrollo intacto durante tests.

## 2. Contrato y API individual

- [x] 2.1 Añadir GET individual protegido y transformer con dueDate sin cambiar colección; verificar Japa 200/data, propia/ajena/Hecho, nombre nulo, privacidad, consulta sin efectos, 401/404. Actualizar aserción de GET inexistente conservando PATCH genérico y DELETE excluidos.
- [x] 2.2 Añadir validación VineJS de dueDate, expectedDueDate y expectedStatus requeridos y parsing canónico sin alterar auth/títulos; verificar null, fechas pasadas, bisiestos, años 0001/9999, imposibles/parciales/espacios/timestamps/tipos incorrectos y referencias ausentes o inválidas, con 422 por campo sin mutación.
- [x] 2.3 Implementar PATCH protegido con comparación y escritura atómicas de fecha/estado consultados y respuesta individual; verificar establecer/cambiar/retirar por dos cuentas y tres estados, adicionales ignorados, columnas de producto conservadas y 401/404 sin efectos.
- [x] 2.4 Verificar conflictos de fecha o estado con 409 sin sobrescritura y carrera real con conexiones independientes sin transacción global compartida; exigir 200/409 para dos fechas distintas nuevas, no aceptar SQLITE_BUSY como conflicto. Cubrir no-op y límite de comparación de valores sin añadir garantía ABA; aislar/limpiar la prueba.
- [x] 2.5 Regenerar registros por boot/tests y documentar contrato y referencias por valores, 200/401/404/409/422 y respuesta perdida; verificar ejemplos contra API y tests/lint/typecheck backend. Registrar adaptación del delta a tareas-compartidas y preservación de escenarios anteriores.

## 3. Calendario local y cliente

- [x] 3.1 Crear único evaluador puro de vencimiento con día inyectable y tests permanentes frontend/tests/task-calendar.test.ts usando node:test y node:assert/strict, con npm test sin dependencia nueva; verificar ayer/hoy/mañana/null, tres estados, dos días locales, avance de día y conservación de fecha importando el mismo módulo de la UI. Documentar requisito Node 24 y ejecutar npm test.
- [x] 3.2 Añadir obtención de día local y recálculo por próxima medianoche, focus/visibility/pageshow con limpieza de recursos; verificar con reloj y huso controlados medianoche, suspensión y DST, conservación del borrador y ausencia de peticiones de frescura automática.
- [x] 3.3 Añadir tipos y métodos GET/PATCH en lib/api.ts con Bearer, fecha/estado esperados y traducción de errores por campo, 404/409; verificar peticiones y errores castellanos en navegador y build/lint frontend.
- [x] 3.4 Documentar calendario, comando permanente de pruebas, adaptación del DoD backend de FS-118.2, límites delegados y snapshot no vivo; verificar que npm test es repetible sin entorno temporal, no duplica regla ni almacena vencida, y registrar pruebas complementarias de navegador.

## 4. Detalle protegido y navegación

- [x] 4.1 Adaptar router a data router conservando AuthProvider, guards, destinos y rutas existentes; verificar en navegador registro/login a profile, rehidratación, acceso anónimo y logout/back en profile/tasks/detalle, sin cambiar requisitos de cuentas-y-acceso.
- [x] 4.2 Añadir enlace de tarea y página protegida tasks/:id con título/responsable/estado de consulta, editor de fecha y regreso; verificar teclado, acceso individual Hecho, fallback de nombre, carga/error/reintento manual y 404 sin detalle ficticio. Confirmar lista sin fechas/marcas y creación con solo título.
- [x] 4.3 Añadir snapshot/borrador, Quitar fecha pendiente, Guardar y Descartar edición; verificar editar/vaciar no escribe, señal sobre valores guardados, entrada incompleta no se retira, éxito limpia dirty y Descartar copia snapshot sin PATCH ni salida.
- [x] 4.4 Bloquear salida interna/atrás/adelante durante guardado sin ofrecer descarte; tras resolver, confirmar salida solo si dirty, y solicitar beforeunload si dirty o saving. Verificar permanecer/descartar después de fallo, salida sin aviso tras éxito, teclado/foco y límites de cierre forzado; no presentar un envío en curso como cancelado por descarte.
- [x] 4.5 Registrar pruebas de navegación/editor y trazabilidad de guardado explícito frente a CA-16 en docs/detalle-y-fecha-de-vencimiento.md; verificar build/lint frontend sin dependencias de pruebas nuevas en el proyecto.

## 5. Fallos y recuperación de conflictos

- [x] 5.1 Bloquear edición, segundo envío y salida mientras guarda e ignorar respuestas antiguas por tarea/sesión/desmontaje; verificar GET/PATCH demorados, envío único, salida bloqueada hasta resolución y sesión nueva limpia, respetando que pérdida de sesión no conserva contenido protegido.
- [x] 5.2 Conservar borrador/snapshot ante 422, red y 5xx, con error inline o aviso general y recuperación manual; verificar sin éxito falso ni reintento automático, dirty y aviso de salida mantenidos, y 404 durante edición sin posibilidad de guardar una tarea inexistente.
- [x] 5.3 Implementar 409 y Guardar bloqueado hasta Consultar cambios; verificar dos sesiones/fixture de estado, borrador preservado, GET manual actualiza fecha/estado de referencia sin PATCH, Descartar edición adopta valor recuperado sin salir ni escribir y nuevo guardado compara nueva referencia.
- [x] 5.4 Verificar consulta de recuperación fallida, borrador igual al valor recuperado, conflicto repetido y respuesta de guardado perdida tras persistir; documentar resultados y límites de recuperación/exactly-once en docs/detalle-y-fecha-de-vencimiento.md.

## 6. Integración y entrega del incremento

- [x] 6.1 Comprobar todos los escenarios del delta en una matriz de evidencia Japa/navegador, incluidos negativos de alcance, etiqueta textual, sin penalización por fecha ausente y regresiones del incremento anterior; registrar integraciones de cambio de estado/reasignación/filtro todavía pendientes, sin declararlas completas.
- [x] 6.2 Aplicar migración en entorno normal antes del smoke test y verificar fichero SQLite y due_date efectiva; comprobar cuenta existente/nueva en localhost:3333/frontend normal abrir/guardar/retirar y alta/lista, sin truncar desarrollo. Registrar resultado separado del entorno test para detectar fallo de preparación anterior.
- [x] 6.3 Ejecutar tests/lint/typecheck backend y npm test/build/lint frontend, revisar registros y alcance del diff; verificar openspec validate detalle-y-fecha-de-vencimiento --strict y documentar resultados sin archivar automáticamente.
