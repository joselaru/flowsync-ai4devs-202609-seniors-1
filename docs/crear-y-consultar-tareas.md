# Crear y consultar tareas — demo

Incremento de creación y lista compartida inicial, en API e interfaz. Las decisiones y su procedencia están en `openspec/changes/crear-y-consultar-tareas/`. No completa el MVP: no incluye filtro, actualización automática, detalle, fecha de vencimiento ni modificaciones de tareas existentes.

## Persistencia y preparación

La tabla `tasks` guarda `id`, `title`, `assignee_id`, `status`, `created_at` y `updated_at`. El responsable referencia a un usuario y los únicos estados permitidos por SQLite son `pending`, `in_progress` y `done`. La creación nace en Pendiente y asignada al usuario autenticado. No hay cascada de borrado de cuentas ni histórico.

Desde `backend/`, preparar la base de desarrollo con `node ace migration:run`. El comando genera `database/schema.ts`; no se edita a mano. `node ace migration:rollback` revierte el último lote y puede eliminar las tareas: conservar sus datos antes si se necesitan. En una base aislada se comprobó migración, rollback y nueva migración.

## Pruebas aisladas

Desde `backend/`:

```bash
npm test
npm run typecheck
npm run lint
```

El runner fija `NODE_ENV=test`. La conexión usa `tmp/db.test.sqlite3`, distinta de `tmp/db.sqlite3` de desarrollo. El setup de la suite funcional migra la base de pruebas y su teardown revierte las migraciones; cada test usa una transacción global y su rollback. No ejecutar runners simultáneos contra ese mismo fichero.

Para migrar o revertir manualmente solo pruebas, usar `NODE_ENV=test node ace migration:run` y `NODE_ENV=test node ace migration:rollback` desde `backend/`. Después de un rollback que regenera un esquema vacío, ejecutar de nuevo migration:run para regenerar las clases de las tablas.

La prueba `database_isolation.spec.ts` consulta el fichero realmente abierto por SQLite y escribe un usuario dentro de una transacción. Se verificó que el SHA-256 de la base de desarrollo permaneció idéntico antes y después de ejecutarla. `task_model.spec.ts` verifica persistencia, relación y rechazo de estados inválidos.

El bodyparser recorta espacios por defecto. Para cumplir la conservación del título, `POST /api/v1/tasks` usa el parser con recorte desactivado; el resto de rutas conserva su configuración original. Este ajuste localizado se autorizó al detectar la incompatibilidad durante las pruebas.

## API

Todas las operaciones requieren `Authorization: Bearer <token>` válido; sin él responden `401`. La base de URL de desarrollo es `http://localhost:3333`.

### Crear

`POST /api/v1/tasks` con `Content-Type: application/json` y cuerpo `{"title":"Revisar pagos"}` devuelve `201`:

```json
{
  "data": {
    "id": 1,
    "title": "Revisar pagos",
    "status": "pending",
    "createdAt": "2026-10-03T12:00:00.000+00:00",
    "assignee": { "fullName": "Ada" }
  }
}
```

Los datos de responsable no incluyen email, ID de cuenta, contraseña, tokens ni fechas de cuenta. `fullName` puede ser `null`; la interfaz lo presenta como «Sin nombre». Los estados públicos son `pending`, `in_progress` y `done`.

Solo se procesa `title`. Otros campos, incluidos responsable, estado o fecha, se ignoran: nunca sustituyen los valores iniciales del servidor. Los títulos deben ser strings no vacíos ni completamente blancos y tener hasta 255 **unidades UTF-16**. Se cuentan y conservan los espacios exteriores; no se normaliza Unicode. `😀` cuenta como dos unidades. No se recorta un título excesivo.

Un título inválido devuelve `422` con `{ "errors": [{ "field": "title", "rule": "...", "message": "..." }] }` (puede haber otros metadatos). La interfaz traduce estos errores a castellano junto al campo. Los casos de creación se verifican con `npm test -- --files=create_task` desde `backend/`.

### Consultar

`GET /api/v1/tasks` devuelve `200` y `{ "data": [ ... ] }`, con la misma representación de tareas. Un resultado sin filas es `{ "data": [] }`. Se incluyen Pendiente y En curso, se excluye Hecho y se ordena por creación descendente con ID descendente como desempate. No hay restricción por propietario ni agrupación, filtros configurables, detalle o paginación.

La consulta no modifica tareas. La lista es una foto al entrar o recargar: los cambios ajenos no llegan automáticamente. La creación propia confirmada sí se incorpora localmente sin recarga. La consulta de tareas hechas mediante filtro pertenece a una entrega posterior.

`list_tasks.spec.ts` comprueba cuentas distintas, orden con empates, estados, privacidad, lista vacía, ausencia de mutaciones y endpoints excluidos. `auth_compatibility.spec.ts` verifica que el ajuste del parser no altera registro/login y que logout revoca el token utilizado. Los registros en `backend/.adonisjs/` se regeneran al arrancar o ejecutar los tests; no se editan a mano.

## Verificación de interfaz — 3 de octubre de 2026

Comprobación ejecutada con Playwright y Chromium headless en un entorno temporal autorizado por el usuario. Paquete, navegador y librerías compartidas se descargaron/extrajeron en `/tmp/opencode/flowsync-playwright/`; no se añadió dependencia ni runner al proyecto ni se instalaron paquetes del sistema. Scripts: `check.mjs` y `states.mjs`; resultado: `results.json`, captura: `tasks.png` en ese directorio. Los archivos temporales no forman parte del repositorio.

Se usó la API aislada con `NODE_ENV=test`, puerto 3334 y `tmp/db.test.sqlite3`, Vite en 5174 con `VITE_API_URL=''` y un proxy temporal de mismo origen en 5175. No se utilizó la base de desarrollo. Los scripts limpian exclusivamente los datos de la base de pruebas y crean cuentas nuevas; no ejecutarlos simultáneamente con Japa. Para repetir:

```bash
LD_LIBRARY_PATH=/tmp/opencode/flowsync-playwright/libs/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_BROWSERS_PATH=/tmp/opencode/flowsync-playwright/browsers \
node /tmp/opencode/flowsync-playwright/check.mjs
# Con las mismas variables, ejecutar después states.mjs.
```

Para repetir manualmente: registrar dos cuentas (una sin nombre), comprobar llegada a `/profile`, usar «Ver tareas del equipo», crear desde ambas y volver mediante «Mi perfil». Mantener B en la lista mientras A crea; B obtiene la nueva tarea solo al recargar o volver a entrar. Cerrar sesión y visitar `/tasks` y `/profile`: ambos conducen a login. Simular fallo o demora de GET/POST con la red del navegador para comprobar recuperación.

| Criterios comprobados | Resultado |
| --- | --- |
| Visita anónima, registro y login a `/profile`, enlaces perfil/lista/regreso, logout y protección de ambas vistas en dos sesiones | Pasa |
| Navegación del enlace por Tab/Enter; envío con Enter; oferta de primera tarea coloca foco en el título | Pasa |
| Formulario solicita solo título y no usa `maxlength`; Bearer y cuerpo `{title}`; respuesta real `201` | Pasa |
| Título vacío/blanco y 256 unidades, 255 letras + espacio, 254 letras + `😀`: `422`, error inline en castellano, `aria-invalid` y asociación `aria-describedby` | Pasa |
| 255 letras y 253 letras + `😀` aceptados; espacios exteriores íntegros; texto conservado tras cada error y campo limpiado solo tras éxito | Pasa |
| Alta propia visible sin navegación/recarga ni segundo GET, varias altas y orden descendente | Pasa |
| Dos responsables, fallback «Sin nombre», sin email/fechas de cuenta; fixtures reales En curso visible y Hecho excluido | Pasa |
| Filas sin enlaces o botones, sin selector de filtro/estado | Pasa |
| GET lento: carga diferenciada y formulario bloqueado; GET fallido: aviso de conexión y reintento manual; éxito vacío habilita creación | Pasa |
| POST fallido: texto exacto conservado, error general y recuperación manual; sin reenvío automático | Pasa |
| POST pendiente: input/botón deshabilitados, segundo Enter no envía otra solicitud, sin fila optimista | Pasa |
| Respuestas de GET/POST demoradas tras desmontar/logout no contaminan el perfil/login; siguiente sesión comienza con formulario limpio y crea con su propia identidad | Pasa |
| B permanece sin recibir cambios automáticos; nueva consulta obtiene lo creado por A | Pasa |
| Sin excepciones JavaScript no controladas | Pasa |

En desarrollo React StrictMode ejecuta dos veces el efecto de montaje: puede haber dos GET iniciales. La verificación confirmó que después del fallo el contador no crece por sí solo y que no hay polling, reintentos programados ni reenvíos de alta. El formulario bloqueado hasta completar lectura evita que una consulta inicial pendiente sobrescriba un alta propia.

La política UTF-16, conservación de espacios, dependencia de lectura y recuperación manual proceden de las decisiones delegadas y confirmadas para la demo (ver propuesta y diseño), no de requisitos adicionales atribuidos al PRD. Este incremento conserva las exclusiones aprobadas: sin filtro, actualización automática, detalle, fechas visibles ni mutaciones adicionales; no completa la frescura del MVP.

## Resultado de integración

- Playwright: 15 grupos de comprobaciones del flujo y una comprobación adicional con fixtures reales de estados, todos correctos.
- Backend: `npm test` — 28 casos correctos; `npm run lint` y `npm run typecheck` — correctos.
- Frontend: `npm run build` y `npm run lint` — correctos, sin advertencias de lint.
- `openspec validate crear-y-consultar-tareas --strict` — correcto.
- SHA-256 de `backend/tmp/db.sqlite3` tras la verificación: `412a57dd56b44e9952d19119e3432553ca06488fb594782ef9b3c0e1c01be5a3`, idéntico al previo.

La primera ejecución de integración encontró las fixtures persistidas por la comprobación de UI en la base de pruebas: 16 aserciones que esperaban una base vacía fallaron. Después de retirar los servidores temporales y del rollback de suite, la ejecución desde una base vacía pasó los 28 casos. También se corrigió el formato de una cadena de métodos en `list_tasks.spec.ts`. No hubo discrepancias nuevas del contrato; las comprobaciones de UI y Japa deben usar la base aislada vacía en momentos separados.

### Cobertura del delta aprobado

| Requisito | Evidencia |
| --- | --- |
| Acceso autenticado | Japa de creación/consulta + navegación anónima y logout en Playwright |
| Creación mínima y claves adicionales ignoradas | `create_task.spec.ts` + inspección de input y petición real en Playwright |
| Validación, conservación y conteo UTF-16 | Casos Japa de ausente, tipos inválidos, blancos, 255/256, espacios, emoji y Unicode sin normalización + errores UI |
| Responsable de sesión y estados iniciales | Japa con dos cuentas + altas reales en sesiones UI distintas |
| Consulta compartida, estados y ausencia de mutaciones | `list_tasks.spec.ts` + dos sesiones y fixtures reales en Playwright |
| Contrato público y privacidad | Aserciones Japa de status/envoltorio/campos + peticiones y representación UI |
| Orden descendente | Japa con fechas y empates + varias altas y fixture reciente en UI |
| Representación y fallback | Playwright con nombre, nombre nulo y En curso; Japa de datos mínimos |
| Resultado propio confirmado y fallo recuperable | Alta real visible sin recarga; red fallida, texto conservado y reintento manual |
| Disponibilidad y envío único | GET/POST demorados, bloqueo, respuesta tardía ignorada y recuperación manual |
| Carga, vacío y error | Playwright en espacio vacío, consulta lenta y conexión rechazada |
| Acceso existente y teclado | Registro/login a perfil, Tab/Enter, enlaces de ida/regreso y asociación de error al campo |

Revisión del diff: la implementación añade solo persistencia/API de tareas, parsing localizado, aislamiento y pruebas, cliente centralizado, pantalla protegida y enlaces. No cambia validadores, pantallas de login/registro ni requisitos de `cuentas-y-acceso`; los registros `.adonisjs` reflejan las nuevas rutas y transformer. Se conserva el trabajo previo en `.opencode/` y `openspec/`. El cambio sigue activo, sin archivar.
