# Proposal

## Why

FlowSync permite crear y consultar tareas, pero aún no abrirlas ni registrar un compromiso de fecha. RF-13 a RF-15 exigen una fecha opcional fuera de la lista: entregar detalle mínimo y fecha juntos resuelve esa dependencia sin ampliar el formulario de creación.

## What Changes

- Abrir desde la lista un detalle protegido con título, responsable y estado de solo consulta; volver a la lista mediante teclado o ratón.
- Consultar, establecer, cambiar y retirar únicamente la fecha, en tareas propias o ajenas y en cualquier estado; admitir fechas pasadas.
- Guardar explícitamente. Bloquear la salida mientras el guardado está en curso; cuando no hay envío pendiente, confirmar el descarte al salir con cambios. Conservar la edición y mostrar errores en castellano ante validación o fallo de guardado.
- Mostrar «Vencida» sobre datos guardados cuando la fecha es anterior al día local del navegador y el estado no es Hecho. Recalcular al cambiar el día o recuperar la pestaña, sin consultar cambios ajenos automáticamente.
- Comparar atómicamente fecha y estado actuales con los consultados y rechazar diferencias sin sobrescribir. Sin garantía de detectar cambios intermedios revertidos (ABA). «Consultar cambios» conserva la edición y exige un nuevo guardado explícito; permite descartar solo el borrador sin salir.
- Mantener alta con solo título, lista sin fechas ni marcas de vencimiento, orden y contrato de colección existentes y destinos `/profile` de acceso.
- Excluir edición de título, responsable o estado, borrado, filtros, notificaciones, actualización automática ajena y configuración de zona horaria.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `tareas-compartidas`: extender el contrato de API existente con consulta individual (incluido Hecho) y edición de fecha; añadir requisitos de detalle, vencimiento y recuperación, preservando escenarios de creación/colección. No crear una capability por superficie de UI ni modificar `cuentas-y-acceso`.

## Impact

- Backend: migración de fecha sobre tareas existentes, esquema generado, comparación condicional de valores, consulta individual, validadores, transformer individual y registros generados; sin revisión monotónica ni trigger.
- Frontend: enlace desde filas, detalle protegido, editor con fecha guardada y borrador separados, bloqueo de navegación, cálculo de calendario local y cliente API centralizado.
- Verificación: Japa aislado en SQLite de pruebas, tests permanentes del calendario en el repositorio con el runner nativo de Node (sin dependencia de runner nueva), conflictos atómicos y comprobación de navegador. Smoke test del entorno normal después de aplicar la migración, no solo de la base de tests.

### Fuentes y procedencia

Autoridad: `docs/prd/alcance-mvp.md` (opcionalidad, superficie y roles planos), `docs/prd/flowsync-mvp.md` (RF-13/14/15, RF-4, RNF-8/10, PA-1/6/8), `docs/backlog/README.md` y sus historias enlazadas FS-118 y E2-5; baseline de las living specs existentes.

El usuario confirmó en explore el alcance conjunto, campos de consulta, fecha como único dato editable, fechas pasadas, permisos planos, guardado explícito, confirmación de descarte, etiqueta textual sobre valores guardados, día local del dispositivo, recálculo por calendario, conflictos de fecha/estado y recuperación manual; después confirmó conservar borrador y fecha guardada ante validación o fallo de red/servidor.

El guardado explícito sustituye CA-16 y los DoD de FS-118 que proponen autosave. Se concretan CA-4/13/14/17 y PA-8 para fecha/estado; no se resuelve PA-8 para todas las futuras ediciones. PA-1 mantiene la precedencia de ocultar fecha/vencimiento en lista. El detalle mínimo concreta PA-6 solo para esta entrega.

Cambio de estado, reasignación y filtro de Hecho siguen pendientes: sus integraciones de FS-118.5 no pueden darse por completas aquí. Hecho se verifica con fixtures y consulta directa del detalle, sin añadir filtro. Las notas de backlog sobre ausencia de pruebas y BD compartida ya no describen el código actual. No se modifica ese backlog durante esta planificación.

### Resolución de revisión y decisiones menores delegadas

El usuario confirmó evolucionar tareas-compartidas, consulta individual de Hecho, ausencia de garantía ABA, bloqueo de salida durante guardado y cobertura automatizada permanente. Autorizó elegir interacciones/validación menores simples para MVP, documentadas para revisión posterior: página `/tasks/:id`, input de fecha y retirada con campo vacío o «Quitar fecha» seguida de Guardar, «Descartar edición» para adoptar el valor consultado sin salir, fechas civiles gregorianas `YYYY-MM-DD` entre 0001 y 9999 y error 404 ante recurso inexistente. No proceden de requisitos originales del PRD. Justificación y límites en design.md; rutas y payloads son propuestas técnicas del plan.
