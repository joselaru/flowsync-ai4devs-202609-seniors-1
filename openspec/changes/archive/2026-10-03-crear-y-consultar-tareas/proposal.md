# Proposal

## Why

FlowSync tiene cuentas y acceso, pero no permite registrar ni consultar el trabajo compartido. Introducir creación y lista inicial establece la base priorizada por E3-1, E2-1, E2-3 y E2-2 sin intentar completar el resto del MVP.

## What Changes

- Crear tareas desde API e interfaz con un único dato solicitado: título. Cada tarea nace asignada a quien la crea y en estado Pendiente.
- Rechazar títulos ausentes, en blanco o de más de 255 unidades UTF-16, con mensajes comprensibles y sin truncamiento silencioso. Conservar el texto válido, incluidos espacios exteriores.
- Consultar una lista compartida autenticada, mostrando título, responsable y estado. La vista inicial incluye Pendiente y En curso, conforme al PRD; no incorpora controles de filtro.
- Ordenar por creación de más reciente a más antigua, sin agrupación por responsable.
- Mostrar «Sin nombre» si el responsable no tiene nombre, sin sustituirlo por email ni identificador.
- Añadir una pantalla protegida de tareas accesible desde el perfil. La creación propia confirmada aparece sin recargar; los cambios ajenos solo se obtienen en una nueva consulta.
- Mostrar carga, fallo de consulta y espacio sin tareas como estados distintos; ofrecer crear la primera tarea en el espacio vacío.
- Habilitar la creación tras obtener correctamente la lista inicial; ante fallo de consulta ofrecer reintento manual y ante fallo de alta conservar el título.
- Excluir filtro por estado, actualización automática, detalle, fechas, edición, reasignación, borrado y cambios de estado. Los tres estados del dominio no implican controles para cambiarlos en esta entrega.

## Capabilities

### New Capabilities

- `tareas-compartidas`: creación de tareas y consulta inicial del trabajo común, con validación, valores iniciales, representación mínima del responsable y acceso autenticado.

### Modified Capabilities

Ninguna. `cuentas-y-acceso` conserva sus requisitos y redirecciones a `/profile` tras registro y login. Un enlace desde el perfil permite usar la capacidad sin cambiar esos destinos.

## Impact

- Backend: migración y modelo de tareas sobre SQLite/Lucid, relación con usuarios, validación VineJS, controladores y rutas protegidas bajo `/api/v1`, transformer y registros generados.
- Frontend: cliente API y tipos, pantalla protegida de tareas, formulario de título, presentación de lista y enlace desde el perfil; estilo y errores coherentes con la interfaz existente.
- Verificación: casos funcionales Japa con aislamiento de base de datos y comprobación de la experiencia de interfaz, que actualmente carece de runner de tests.
- Sin servicios externos ni nuevos conceptos de equipo, rol, historial o presencia.

### Fuentes, decisiones y discrepancias

- Autoridad: `docs/prd/alcance-mvp.md` prevalece ante conflictos con `docs/prd/flowsync-mvp.md`; `docs/backlog/README.md` enlaza las historias y define prioridades y bloqueos. La living spec `cuentas-y-acceso` describe la compatibilidad actual.
- El usuario aprobó explícitamente: alcance API e interfaz sin filtro, frescura automática ni detalle; orden descendente de creación sin agrupación; máximo de 255 caracteres; «Sin nombre» para responsables sin nombre.
- El PRD pide entrar al espacio tras registro, mientras que la living spec dirige al perfil. Por instrucción del usuario, ese cambio de destino queda pendiente para otra entrega.
- E3-1 exige un nombre, pero el registro admite `null`: el fallback aprobado resuelve esta entrega sin exigir nombre al registrarse. Varias cuentas sin nombre pueden resultar indistinguibles.
- E2-1 marca la aparición inmediata propia como propuesta, aunque RNF-3 ya exige reflejar la creación inmediatamente. Se aplica RNF-3 tras confirmación de éxito, sin interpretar «inmediato» como obligación de UI optimista.
- El máximo de título estaba abierto en PA-9; queda concretado por el usuario en 255 caracteres. La ordenación de esta entrega concreta PA-3 sin prometer resolver la legibilidad de todo el MVP.
- FS-142 mantiene abiertas sus decisiones de filtro, y E3-2 contiene notas desalineadas con RNF-2/RNF-4. No se resuelven en este cambio porque ambas capacidades están excluidas.

### Decisiones delegadas para la demo

El usuario autorizó resolver los puntos de revisión con la opción más simple y práctica y confirmó las revisiones siguientes. Se distinguen de sus aprobaciones originales y de los requisitos procedentes del PRD; pueden revisarse posteriormente sin atribuirlas a las fuentes.

| Punto | Decisión para esta entrega | Justificación y límite |
| --- | --- | --- |
| Dependencia entre lectura y alta | Mantener el formulario deshabilitado hasta que la consulta inicial tenga éxito. Si falla, ofrecer reintento manual. | Evita carreras entre la primera lectura y la creación con un estado local simple. Aunque el alta pudiera funcionar, no estará disponible mientras no se obtenga la lista. |
| Medida y conservación del título | Máximo de 255 unidades UTF-16, contando también espacios exteriores y conservando el texto válido tal cual. Rechazar un título completamente en blanco. | Coincide con JavaScript y `maxLength` del VineJS instalado, sin normalización ni validador Unicode adicional. Un emoji fuera del plano básico cuenta como dos unidades; no se cuentan grafemas visuales. |
| Recuperación | Conservar el título al fallar el alta y permitir reintentar manualmente la consulta. Sin reintentos automáticos. | Recuperación básica que evita perder el trabajo escrito y no introduce actualización automática. |
| Campos adicionales en el alta | Ignorar todos los campos salvo `title`; responsable y estado se fijan en servidor. | Sigue el filtrado de payload del proyecto, sin una política adicional de rechazo de claves desconocidas. |
| Contrato público de API | `POST /api/v1/tasks` devuelve `201` y `GET /api/v1/tasks` devuelve `200`, con envoltorio `data`; tarea `{ id, title, status, createdAt, assignee: { fullName } }` y estados `pending`, `in_progress`, `done`. | Hace explícito el contrato externo y mantiene serialización y rutas del proyecto. La fecha sirve para ordenación, no se muestra como nuevo dato de producto. |

Este incremento no completa el MVP ni su requisito de frescura. Las decisiones delegadas quedan registradas para revisión posterior; no se presentan como decisiones previamente tomadas por el PRD. No se introduce filtro, actualización automática ni detalle.
