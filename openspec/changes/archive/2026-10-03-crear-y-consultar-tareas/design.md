# Design

## Context

Ver `proposal.md` para motivación, autoridad documental y decisiones aprobadas. El repositorio usa AdonisJS 7, Lucid 22, VineJS 4 y SQLite; la interfaz usa React 19, React Router, Tailwind y componentes existentes. Actualmente solo hay usuarios, tokens y rutas de acceso. La living spec `cuentas-y-acceso` conserva `/profile` como destino autenticado.

`backend/config/database.ts` habilita generación de esquema: los modelos extienden las clases de `database/schema.ts`. `backend/providers/api_provider.ts` ofrece `serialize()` con envoltorio `data`. Los registros de controladores y cliente se generan al arrancar. `frontend/src/lib/api.ts` centraliza fetch, Bearer y traducción de errores. Japa está preparado pero no tiene casos; la interfaz no tiene runner.

El diseño es necesario porque el cambio añade persistencia y cruza API, navegación, cliente y pruebas. Las decisiones delegadas para la demo, su justificación y sus límites están registrados en `proposal.md`; el contrato observable correspondiente está en el delta de specs. Se distinguen de los requisitos de las fuentes y pueden revisarse posteriormente.

## Goals / Non-Goals

**Goals:**
- Integrar una base de tareas con los patrones existentes de datos, autenticación, serialización y errores.
- Derivar los valores iniciales en servidor y entregar una representación mínima compartida.
- Mantener un flujo simple de consulta y creación propia confirmada, con orden estable.
- Obtener evidencia funcional automatizada del contrato de API y evidencia de interfaz sin introducir un runner como requisito de producto.

**Non-Goals:**
- Introducir infraestructura de eventos, polling, cache global, librerías de datos o servicios externos.
- Añadir endpoints de detalle o mutaciones distintas de creación.
- Alterar la política de sesión o los destinos de acceso. Las exclusiones de producto completas están en la propuesta.

## Decisions

### 1. Modelo mínimo de tarea

Propuesta técnica: tabla `tasks` con identificador, `title`, `assignee_id` no nulo referenciando usuarios, `status` y fechas de creación/actualización. Representar los estados internos como `pending`, `in_progress` y `done`, traducidos en pantalla a Pendiente, En curso y Hecho. Limitar los valores también en la base de datos mediante una restricción compatible con SQLite/Lucid, verificada contra las APIs instaladas.

La validación admite 255 unidades UTF-16, como `string.length` de JavaScript y `maxLength` del VineJS instalado. SQLite no garantiza por sí solo el máximo por declarar un varchar, por lo que la validación de servidor es necesaria. Los espacios exteriores cuentan y se conservan: no usar trim ni normalización Unicode antes de validar o guardar. Comprobar por separado que el título no es completamente blanco. Un emoji como `😀` cuenta como dos unidades; no se cuentan grafemas visuales. Esta política aprovecha la validación existente y evita un algoritmo Unicode adicional. No introducir unicidad de títulos ni detección semántica de duplicados.

Durante apply, los casos de espacios detectaron que el bodyparser del framework recorta por defecto antes de la validación. El usuario autorizó un ajuste localizado: un middleware delega en el parser existente con `trimWhitespaces: false` solo en `POST /api/v1/tasks`, conservando las opciones originales para todas las demás rutas, incluidas las de acceso. Se verifica la preservación del título y la compatibilidad de registro/login, sin modificar el contrato de `cuentas-y-acceso`.

Crear una migración y generar `TaskSchema` mediante la herramienta del proyecto; `Task` añade la relación con `User`, sin editar el esquema generado. No se necesita guardar el autor como concepto separado del responsable para estos flujos, ni añadir fecha de vencimiento anticipadamente. La relación no introduce borrado automático de tareas al eliminar usuarios: no existe un flujo de borrado de cuentas en este alcance.

Alternativas: usar un string sin restricción permite estados inválidos; añadir una entidad de estados implica configuración excluida. Ampliar el esquema para todo el MVP adelanta decisiones y trabajo ajenos a esta entrega.

### 2. Endpoints protegidos y representación mínima

Contrato externo fijado para esta demo por delegación del usuario, siguiendo `/api/v1`:

| Operación | Petición | Respuesta de éxito |
| --- | --- | --- |
| Crear | `POST /api/v1/tasks`, JSON `{ title }`, Bearer válido | `201`, `{ data: Task }` |
| Consultar lista inicial | `GET /api/v1/tasks`, Bearer válido | `200`, `{ data: Task[] }` |

Representación acordada para la demo: `Task = { id, title, status, createdAt, assignee: { fullName } }`, con estados públicos `pending`, `in_progress` y `done`; `createdAt` se serializa como fecha ISO. `fullName` puede ser `null`. La UI usa «Sin nombre» sin exponer el email. La fecha de creación sirve para ordenar, no se muestra como nuevo dato de producto. No reutilizar `UserTransformer` completo, que expone email y fechas de cuenta. Las rutas, códigos y representación son contrato externo, no simples detalles internos.

Ambas rutas usan el middleware de autenticación API existente. El servidor toma el responsable de la identidad autenticada y fija Pendiente; valida y extrae únicamente `title`, ignorando campos adicionales incluso si contienen responsable o estado. Un título válido con esas claves se acepta: no se introduce rechazo de claves desconocidas. Esto sigue el filtrado de payload del proyecto y evita una política nueva de validación. Usar `vine.create` y `request.validateUsing`, con errores de título `422` en el formato existente y autenticación inválida `401`.

La consulta no restringe por usuario: carga los responsables de forma conjunta para evitar consultas por fila. Devuelve Pendiente y En curso, ordenando por `created_at DESC, id DESC`; el identificador desempata fechas iguales de forma estable sin añadir significado de producto. No hay parámetros funcionales de filtro ni paginación en esta entrega; se conserva la lista completa para la escala objetivo del PRD.

Alternativas: devolver modelos en crudo incumple los patrones de serialización; devolver usuarios completos expone datos innecesarios; hacer listas por propietario contradice el espacio común. Un endpoint de detalle o de modificación de estado ampliaría el alcance.

### 3. Pantalla protegida accesible desde el perfil

Propuesta técnica: ruta `/tasks` bajo `ProtectedRoute` y enlace visible desde `ProfilePage`. Añadir un enlace de regreso al perfil en la pantalla de tareas para mantener accesibles las acciones de cuenta. Se conserva la redirección actual a `/profile` desde login, registro y rutas desconocidas. No hay delta de `cuentas-y-acceso`: añadir un enlace no cambia sus requisitos existentes.

La pantalla presenta explicación de la lista, formulario con un campo de título y botón de creación, y filas de título, responsable y etiqueta de estado. Seguir los componentes y tokens visuales existentes; no editar a mano componentes generados. No hacer clicables las filas como si existiera detalle ni añadir controles de estado.

Alternativa: hacer la lista destino automático tras acceder rompería los escenarios actuales de la living spec y el usuario lo excluyó salvo necesidad. Acceder mediante enlace satisface la utilización de la capacidad sin esa modificación.

### 4. Estado local y confirmación de creación

Propuesta técnica: gestionar carga, lista, error de consulta y envío en la pantalla o en un hook específico de tareas. Añadir `getTasks(token)` y `createTask(token, payload)` a `lib/api.ts` y los tipos a `lib/types.ts`. Extender las etiquetas/traducciones de error para `title` sin reutilizar el formulario de auth como dependencia de dominio.

Consultar al montar con sesión resuelta. Ignorar respuestas pendientes si se desmonta la pantalla o cambia el token; una consulta antigua no debe sobrescribir una creación posterior. Mantener el formulario deshabilitado durante la consulta inicial y también si falla; habilitarlo solo tras una consulta o reintento exitoso, incluso con lista vacía. Bloquear nuevos envíos mientras haya un alta pendiente. Se elige este acoplamiento para simplificar el estado y evitar carreras: aunque el endpoint de alta pudiera funcionar, no se podrá crear mientras falle la lectura. Es una limitación de demo explícita, no una necesidad de negocio general ni una política de idempotencia de servidor.

Al confirmar un alta, incorporar la representación devuelta, deduplicar por ID, ordenar con el mismo criterio y limpiar el campo. No esperar una consulta adicional para mostrar el resultado propio. Si falla, conservar el título y habilitar el formulario con error junto al campo o aviso general. Conservar el texto evita pérdida de trabajo y permite corregirlo o reenviarlo; esta recuperación básica fue seleccionada por delegación para la demo. No usar un atributo HTML que recorte o impida introducir texto excesivo silenciosamente: permitir que el intento reciba un error visible conforme al contrato.

La lista no tiene actualización por temporizador, al recuperar foco ni por suscripción. Recargar o volver a entrar solicita una nueva lista; un botón de reintento tras error es una acción explícita, no frescura automática. No reintentar automáticamente ni la consulta ni el alta: la recuperación manual es suficiente para esta demo. Distinguir la primera carga de la ausencia de filas y del fallo. En ausencia de filas usar un mensaje neutro («No hay tareas para mostrar») que explique el espacio y ofrezca creación, sin afirmar que no existe ninguna tarea histórica.

Alternativas: crear una fila optimista exige reconciliación y rollback sin que el PRD obligue a esa estrategia; esperar al polling para ver una creación incorpora una capacidad excluida. Un estado local basta para esta superficie.

### 5. Verificación proporcional a las dos capas

Usar Japa funcional y su cliente existente para autenticación, validación (incluidos espacios exteriores y UTF-16), claves adicionales ignoradas, contrato de respuestas, valores iniciales, creación persistente, lectura compartida, exclusión de Hecho, orden y minimización de datos. Preparar fixtures de estados no creables desde la UI solo para comprobar el contrato de consulta; no añadir endpoints para prepararlas.

La configuración de tests apunta al mismo SQLite de desarrollo. Preferir una base separada para tests mediante configuración limitada al entorno de pruebas, con migraciones y limpieza aisladas; no truncar datos del servidor de desarrollo para verificar el cambio. Reusar los plugins existentes y añadir únicamente los hooks necesarios.

Para la UI, realizar una comprobación reproducible en navegador con dos cuentas, teclado y fallos de red, registrando sus resultados durante apply. Verificar también que login/registro y logout conservan su comportamiento. No instalar un runner frontend como decisión implícita; si se considera necesario, revisar ese cambio de tooling antes de ampliarlo.

Alternativas: solo lint/typecheck no verifica el contrato; probar contra datos de desarrollo puede contaminarlos; una suite de UI nueva añade infraestructura que no es imprescindible para este incremento.

## Risks / Trade-offs

- [Lista potencialmente obsoleta mientras permanece abierta] --> Limitación intencionada de esta entrega; no prometer frescura ni cerrar E3-2 con este trabajo.
- [Alta indisponible mientras la consulta inicial falla] --> Reintento manual de lectura y explicación del error; aceptar este acoplamiento para simplificar la demo, sin prometer disponibilidad independiente de creación.
- [255 unidades UTF-16 no equivalen a 255 caracteres visuales] --> Documentar la medida, incluir casos con emoji y espacios en las pruebas y mantener un error visible sin truncamiento.
- [Varias personas sin nombre resultan indistinguibles] --> Usar el fallback aprobado; no revelar email ni convertir el nombre en obligatorio.
- [Pendiente y En curso visibles, pero Hecho sin camino de consulta aquí] --> Conservar el criterio inicial del PRD y dejar explícito que la consulta de hechas mediante filtro pertenece a FS-142. Este cambio no permite pasar tareas a Hecho.
- [Respuesta de alta perdida tras persistir puede llevar a duplicado en un reintento] --> Informar del fallo y permitir comprobar la lista con una nueva consulta; no prometer ejecución exactamente una vez ni añadir deduplicación semántica o infraestructura de idempotencia sin decisión específica.
- [«Sin espera perceptible» no tiene umbral aprobado] --> Mostrar el resultado al resolver el POST, sin espera artificial ni segunda consulta; no inventar un SLA adicional.
- [200 tareas pueden limitar legibilidad incluso con orden] --> Aplicar la regla aprobada y no declarar resuelta la promesa completa de PA-3.
- [Suite comparte SQLite con desarrollo] --> Aislar el fichero y confirmar el entorno antes de pruebas que escriban.

## Migration Plan

1. Durante apply, añadir la migración de tareas y ejecutarla en el entorno previsto, regenerando el esquema; no requiere backfill ni modificación de usuarios.
2. Generar los registros de controladores y cliente mediante el boot del proyecto o los tests; incluir los cambios generados en la revisión de implementación.
3. Desplegar primero API/migración y después la pantalla con enlace desde el perfil. Verificar alta y consulta con cuentas distintas.
4. Para revertir la interfaz, retirar sus rutas y enlaces. Para revertir API, retirar las rutas y componentes de tareas. La reversión de la migración elimina las tareas creadas: conservar copia si se necesita preservar esos datos antes de revertir.

## Open Questions

Los seis puntos de la revisión se han concretado mediante decisiones delegadas para la demo y confirmadas por el usuario: disponibilidad del formulario, medida y conservación del título, recuperación manual, campos adicionales ignorados, contrato externo y registro de su procedencia. No se atribuyen al PRD ni se declaran invariantes generales del producto. No quedan preguntas que impidan implementar este plan acotado; los nombres de componentes y composición visual pueden ajustarse manteniendo el contrato. Las decisiones de filtro, actualización automática, detalle, transiciones, concurrencia de ediciones y cambio del destino autenticado siguen pendientes fuera de esta entrega.
