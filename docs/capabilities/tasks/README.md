# Capability: tareas

## Qué hace

La capability `tasks` ofrece la lista compartida de trabajo del equipo: crear tareas, ver su responsable y estado, acotar la lista por estado y cambiarlo desde la propia fila. Cada tarea tiene además una pantalla de detalle para consultar y modificar su fecha de vencimiento.

En el frontend se accede desde `/tasks` y `/tasks/:id`. Las pantallas están definidas en [las rutas de la aplicación](../../../frontend/src/routes/app-routes.tsx), [la lista](../../../frontend/src/pages/tasks-page.tsx) y [el detalle](../../../frontend/src/pages/task-page.tsx). Las llamadas al backend se centralizan en [lib/api.ts](../../../frontend/src/lib/api.ts).

## Reglas de negocio

La fuente de verdad es la [spec viva de tareas](../../../openspec/specs/tasks/spec.md). Este README sirve como guía de navegación y ejecución; las reglas y sus escenarios se mantienen en la spec:

| Tema | Requisitos en la spec |
| --- | --- |
| Alta y validación del título | [Creación](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título), [título obligatorio](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título) y [longitud](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo) |
| Lista compartida y datos del responsable | [Alcance de la lista](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio) y [representación del responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) |
| Estados, cambios y acceso | [Estados](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos), [cambio de estado](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea) y [autenticación](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión) |
| Detalle y vencimiento | [Fecha opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional), [edición de fecha](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento), [cálculo de vencimiento](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida), [día de referencia](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira) y [consulta individual](../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta) |
| Filtros y comportamiento de la interfaz | [Filtro de API](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado), [control de filtro](../../../openspec/specs/tasks/spec.md#requirement-el-control-para-acotar-la-lista), [filtro en la URL](../../../openspec/specs/tasks/spec.md#requirement-el-filtro-se-pide-en-la-dirección-de-la-lista), [mensajes de lista vacía](../../../openspec/specs/tasks/spec.md#requirement-una-lista-sin-filas-no-significa-siempre-lo-mismo) y [salida de tareas de la vista](../../../openspec/specs/tasks/spec.md#requirement-lo-que-sale-de-la-vista-no-se-pierde) |

La implementación se encuentra en el [modelo Task](../../../backend/app/models/task.ts), los [validadores](../../../backend/app/validators/task.ts) y los controladores enlazados a continuación.

## Endpoints

Rutas comprobadas en [start/routes.ts](../../../backend/start/routes.ts). Todas requieren `Authorization: Bearer <token>` y aceptan/devuelven JSON.

| Método y ruta | Entrada | Respuesta correcta | Implementación |
| --- | --- | --- | --- |
| `GET /api/v1/tasks` | Query opcional: `status=pending`, `in_progress` o `done` | `200`, `{ "data": [Task, ...] }` | [TasksController.index](../../../backend/app/controllers/tasks_controller.ts) |
| `POST /api/v1/tasks` | Cuerpo: `{ "title": "Revisar el informe" }` | `201`, `{ "data": Task }` | [TasksController.store](../../../backend/app/controllers/tasks_controller.ts) |
| `GET /api/v1/tasks/:id` | Query obligatoria: `today=AAAA-MM-DD` | `200`, `{ "data": TaskDetail }` | [TasksController.show](../../../backend/app/controllers/tasks_controller.ts) |
| `PATCH /api/v1/tasks/:id/status` | Cuerpo: `{ "status": "in_progress" }` | `200`, `{ "data": Task }` | [TaskStatusesController.update](../../../backend/app/controllers/task_statuses_controller.ts) |
| `PUT /api/v1/tasks/:id/due-date` | Cuerpo: `{ "dueDate": "AAAA-MM-DD", "today": "AAAA-MM-DD" }`; `dueDate` también admite `null`. `today` puede enviarse en la query en vez del cuerpo. | `200`, `{ "data": TaskDetail }` | [TaskDueDatesController.update](../../../backend/app/controllers/task_due_dates_controller.ts) |

Formas de respuesta según los transformers:

- [Task](../../../backend/app/transformers/task_transformer.ts): `id`, `title`, `status`, `assignee`, `createdAt`, `updatedAt`.
- [TaskDetail](../../../backend/app/transformers/task_detail_transformer.ts): los campos de `Task` más `dueDate` e `isOverdue`.
- [Assignee](../../../backend/app/transformers/task_assignee_transformer.ts): `id`, `fullName`, `initials`.

Errores de contrato: `401` ante token ausente o inválido, `404` en operaciones sobre una tarea inexistente y `422` por validación. Los errores de validación llegan como `{ "errors": [...] }`, con el campo afectado en `field`. El frontend los traduce a mensajes en castellano en [lib/api.ts](../../../frontend/src/lib/api.ts).

## Cómo probar en local

### Preparar y arrancar

Requisito: Node.js 24 o superior. Ejecuta los comandos de cada bloque desde el directorio indicado, relativo a la raíz del repositorio.

Primera instalación del backend, en `backend/`:

```bash
npm install
cp .env.example .env
node ace generate:key
node ace migration:run
npm run dev
```

El backend escucha en `http://localhost:3333`. Si ya existe `.env`, conserva su configuración y ejecuta las migraciones pendientes antes de arrancar.

En otra terminal, primera instalación del frontend, en `frontend/`:

```bash
npm install
cp .env.example .env
npm run dev
```

Abre `http://localhost:5173`, regístrate o inicia sesión y entra en `/tasks`. `VITE_API_URL` en `frontend/.env` configura la dirección del backend; su valor por defecto es `http://localhost:3333`.

### Recorrido manual por API

Con el backend arrancado, inicia sesión con una cuenta registrada:

```bash
curl -i http://localhost:3333/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"secreto123"}'
```

Copia `data.token` de la respuesta y ejecuta:

```bash
export TOKEN='<data.token>'
export TODAY="$(date +%F)"

curl -i http://localhost:3333/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Revisar el informe"}'
```

Copia el `data.id` de la tarea creada:

```bash
export TASK_ID='<data.id>'

curl -i http://localhost:3333/api/v1/tasks \
  -H "Authorization: Bearer $TOKEN"

curl -i "http://localhost:3333/api/v1/tasks/$TASK_ID/status" \
  -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_progress"}'

curl -i "http://localhost:3333/api/v1/tasks/$TASK_ID/due-date?today=$TODAY" \
  -X PUT -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"dueDate":"2026-09-30"}'

curl -i "http://localhost:3333/api/v1/tasks/$TASK_ID?today=$TODAY" \
  -H "Authorization: Bearer $TOKEN"

curl -i "http://localhost:3333/api/v1/tasks/$TASK_ID/due-date?today=$TODAY" \
  -X PUT -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"dueDate":null}'

curl -i 'http://localhost:3333/api/v1/tasks?status=done' \
  -H "Authorization: Bearer $TOKEN"
```

Para probar los errores, consulta la lista sin token, pide `status=archivado` o consulta el detalle sin `today`. Contrasta las respuestas con los escenarios de la spec enlazada arriba.

En la interfaz, recorre la creación, el cambio de estado desde una fila, los filtros y el botón atrás del navegador; abre una tarea, pon y quita una fecha y vuelve a la lista. Los resultados esperados están en los escenarios de interfaz de la [spec](../../../openspec/specs/tasks/spec.md).

### Pruebas automatizadas existentes

Desde `backend/`, con las dependencias, `.env` y migraciones preparadas:

```bash
node ace test functional --files=assignee --files=status_filter --files=overdue
```

Las pruebas actuales verifican:

- [assignee.spec.ts](../../../backend/tests/functional/tasks/assignee.spec.ts): representación del responsable en lista y detalle.
- [status_filter.spec.ts](../../../backend/tests/functional/tasks/status_filter.spec.ts): rechazo de un estado inventado con error sobre `status`.
- [overdue.spec.ts](../../../backend/tests/functional/tasks/overdue.spec.ts): una tarea hecha con fecha pasada no está vencida.

Estos tests no cubren todos los escenarios de la spec. Para ejecutar la suite completa del backend, usa `npm test` en `backend/`. El frontend no tiene runner de tests; sus comprobaciones disponibles son `npm run build` y `npm run lint` en `frontend/`.

La configuración de [SQLite](../../../backend/config/database.ts) apunta a `backend/tmp/db.sqlite3` tanto en desarrollo como en tests. Los tests de tareas existentes usan `testUtils.db().withGlobalTransaction()` para revertir sus escrituras al terminar cada prueba.
