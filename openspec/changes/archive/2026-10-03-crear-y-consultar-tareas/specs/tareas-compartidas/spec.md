# Spec Delta

## Purpose

Permitir a las personas autenticadas registrar tareas con un título y consultar una lista inicial del trabajo compartido, con responsable y estado visibles. Esta entrega establece la base de tareas sin incorporar la actualización automática ni otras capacidades posteriores del MVP.

## ADDED Requirements

### Requirement: Acceso autenticado a las tareas

El sistema SHALL exigir autenticación válida para crear y consultar tareas. La interfaz SHALL dirigir a login a una persona anónima que intente acceder a la lista, sin mostrarle tareas.

#### Scenario: Consulta sin autenticación
- **WHEN** se solicita la lista por API sin una credencial válida
- **THEN** se rechaza la solicitud con `401` y no se devuelve contenido de tareas.

#### Scenario: Creación sin autenticación
- **WHEN** se intenta crear una tarea por API sin una credencial válida
- **THEN** se rechaza la solicitud con `401` y no se crea ninguna tarea.

#### Scenario: Visita anónima a la lista
- **WHEN** una persona con sesión resuelta como anónima visita la pantalla de tareas
- **THEN** se dirige a login sin mostrar el contenido de la lista.

### Requirement: Creación con un único dato solicitado

El sistema SHALL permitir crear una tarea indicando únicamente su título. La API SHALL procesar solo `title` e ignorar otros campos del payload. El flujo de interfaz SHALL pedir solo ese dato, sin ofrecer responsable, estado, fecha ni otros campos.

#### Scenario: Alta de tarea válida
- **WHEN** una persona autenticada solicita crear una tarea con un título válido
- **THEN** se guarda una tarea y la API devuelve su identificador, título, responsable y estado.

#### Scenario: Formulario mínimo
- **WHEN** una persona recorre el flujo de creación desde la lista
- **THEN** solo se le solicita el título, sin pedir ni sugerir otros datos.

#### Scenario: Campos adicionales ignorados
- **WHEN** una persona autenticada envía un título válido junto con campos adicionales, incluidos responsable o estado
- **THEN** la solicitud de creación se acepta, se ignoran esos campos y la tarea nace con el responsable autenticado y en Pendiente.

### Requirement: Validación del título

El sistema SHALL rechazar títulos ausentes, compuestos solo por espacios o de más de 255 unidades UTF-16. SHALL conservar íntegro el texto válido, incluidos espacios exteriores, sin normalizarlo ni truncarlo. El límite SHALL contar también esos espacios. La interfaz SHALL mostrar los errores de título junto al campo en castellano.

#### Scenario: Título ausente
- **WHEN** se intenta crear una tarea sin título
- **THEN** la API rechaza la solicitud por validación, no crea la tarea y la interfaz muestra el problema junto al campo.

#### Scenario: Título en blanco
- **WHEN** se intenta crear una tarea con un título compuesto únicamente por espacios
- **THEN** la API rechaza la solicitud por validación y no se crea una fila sin texto.

#### Scenario: Límite admitido
- **WHEN** se crea una tarea con un título válido de exactamente 255 unidades UTF-16
- **THEN** se acepta y se conserva el título completo.

#### Scenario: Límite excedido
- **WHEN** se intenta crear una tarea con un título de 256 unidades UTF-16
- **THEN** la API rechaza la solicitud por validación y la interfaz informa del límite sin guardar una tarea truncada.

#### Scenario: Conservación de espacios exteriores
- **WHEN** se crea una tarea con un título no vacío de hasta 255 unidades UTF-16 que tiene espacios exteriores
- **THEN** el título devuelto y guardado conserva esos espacios y el texto interior sin modificaciones.

#### Scenario: Espacios que exceden el límite
- **WHEN** un título contiene 255 letras del alfabeto básico y un espacio exterior adicional
- **THEN** se rechaza por superar 255 unidades UTF-16, sin eliminar el espacio para aceptar la solicitud.

#### Scenario: Conteo de un emoji
- **WHEN** un título contiene 254 letras del alfabeto básico y el emoji `😀`
- **THEN** se rechaza por tener 256 unidades UTF-16, ya que ese emoji cuenta como dos unidades; con 253 letras y el mismo emoji se acepta.

### Requirement: Responsable y estado iniciales

El sistema SHALL asignar cada tarea nueva a la persona autenticada que la crea y fijar su estado inicial en Pendiente. El dominio SHALL representar únicamente los estados Pendiente, En curso y Hecho, sin permitir configurarlos.

#### Scenario: Valores derivados de la sesión
- **WHEN** una persona autenticada crea una tarea indicando solo el título
- **THEN** la tarea aparece asignada a esa persona y en estado Pendiente, sin selección manual de responsable ni estado.

#### Scenario: Creación desde clientes distintos
- **WHEN** dos personas autenticadas crean cada una una tarea
- **THEN** cada tarea queda asignada a la persona que realizó su propia solicitud.

### Requirement: Consulta inicial compartida

El sistema SHALL devolver el mismo conjunto de tareas visibles a todas las personas autenticadas que consulten el mismo estado de los datos. La consulta inicial SHALL incluir tareas Pendiente y En curso y excluir Hecho, sin filtros configurables en esta entrega. Consultar SHALL ser una operación de solo lectura.

#### Scenario: Tarea ajena visible
- **WHEN** una persona crea una tarea y otra persona autenticada consulta después la lista
- **THEN** la tarea está disponible para la segunda persona con el mismo título, responsable y estado.

#### Scenario: Mismo conjunto para personas distintas
- **WHEN** dos personas autenticadas consultan la lista sin cambios de datos entre las consultas
- **THEN** reciben el mismo conjunto de tareas y no se restringe el contenido por responsable.

#### Scenario: Vista inicial según los estados
- **WHEN** existen tareas Pendiente, En curso y Hecho y se consulta la lista inicial
- **THEN** se muestran las Pendiente y En curso y no se muestran las Hecho.

#### Scenario: Consulta sin efectos sobre las tareas
- **WHEN** una persona consulta la lista una o varias veces
- **THEN** las tareas conservan su título, responsable y estado.

### Requirement: Contrato público de la API de tareas

La API SHALL ofrecer creación mediante `POST /api/v1/tasks` y consulta inicial mediante `GET /api/v1/tasks`, con JSON envuelto en `data`. Cada tarea SHALL contener `id`, `title`, `status`, `createdAt` y `assignee: { fullName }`; el nombre admite `null`. Los estados públicos SHALL ser `pending`, `in_progress` y `done`.

#### Scenario: Respuesta de creación
- **WHEN** se envía `POST /api/v1/tasks` con un título válido y autenticación válida
- **THEN** se responde con `201` y `{ data: task }`, con los campos definidos y estado `pending`.

#### Scenario: Respuesta de consulta
- **WHEN** se envía `GET /api/v1/tasks` con autenticación válida
- **THEN** se responde con `200` y `{ data: tasks }`, donde `tasks` es un array de tareas con los campos definidos y estados `pending` o `in_progress`.

#### Scenario: Validación fallida
- **WHEN** una solicitud autenticada de creación contiene un título inválido
- **THEN** se responde con `422` y errores de validación asociados a `title`, sin crear la tarea.

### Requirement: Orden de creación descendente

La lista SHALL mostrar las tareas de más reciente a más antigua por creación, sin agruparlas por responsable.

#### Scenario: Tareas creadas en momentos distintos
- **WHEN** se consulta la lista de tareas creadas en momentos distintos
- **THEN** cada tarea más reciente aparece antes que las más antiguas, independientemente de su responsable.

### Requirement: Representación de cada tarea

La interfaz SHALL mostrar título, nombre del responsable y estado de cada tarea sin abrirla. SHALL mostrar «Sin nombre» cuando el responsable carezca de nombre y no sustituirlo por email ni identificador. La respuesta de tareas SHALL evitar exponer datos privados de cuenta innecesarios para esta representación.

#### Scenario: Responsable con nombre
- **WHEN** se muestra una tarea cuyo responsable tiene nombre
- **THEN** la fila muestra el título, ese nombre y el estado, sin necesidad de abrir un detalle.

#### Scenario: Responsable sin nombre
- **WHEN** se muestra una tarea cuyo responsable no tiene nombre
- **THEN** su responsable se presenta como «Sin nombre», sin mostrar email ni identificador en su lugar.

#### Scenario: Datos mínimos de cuenta
- **WHEN** la API devuelve una tarea creada o la lista
- **THEN** los datos de su responsable no incluyen email, contraseña, tokens ni fechas de cuenta.

### Requirement: Resultado propio visible tras la creación

La interfaz SHALL incorporar una tarea propia a la lista al confirmarse su creación, sin exigir recargar ni navegar a otra pantalla. Si la creación falla, SHALL mostrar un error comprensible y conservar el título para que la persona pueda corregirlo o reintentarlo.

#### Scenario: Creación confirmada
- **WHEN** la API confirma la creación desde el formulario de la lista
- **THEN** la tarea se muestra en la lista en su posición de creación descendente sin recarga ni navegación adicional.

#### Scenario: Creación fallida
- **WHEN** falla una solicitud de creación desde el formulario
- **THEN** no se presenta una tarea como confirmada, se conserva el título escrito y se muestra el error sin impedir un nuevo intento.

### Requirement: Disponibilidad del formulario de creación

La interfaz SHALL habilitar la creación solo después de que la consulta inicial de la lista tenga éxito. Mientras carga o tras fallar esa consulta SHALL mantener el formulario deshabilitado. Durante una solicitud de alta SHALL impedir un segundo envío hasta que se resuelva.

#### Scenario: Consulta inicial pendiente o fallida
- **WHEN** la consulta inicial sigue pendiente o ha fallado sin un reintento exitoso
- **THEN** el formulario permanece deshabilitado; si falló la consulta, se ofrece reintentar manualmente.

#### Scenario: Consulta inicial exitosa
- **WHEN** la consulta inicial o su reintento tiene éxito, aunque devuelva una lista vacía
- **THEN** se habilita la creación.

#### Scenario: Envío de alta pendiente
- **WHEN** se está esperando la respuesta a una solicitud de creación
- **THEN** no se puede enviar una segunda solicitud desde el formulario; al resolverse la primera se vuelve a permitir el envío.

### Requirement: Estados de carga, vacío y error

La interfaz SHALL distinguir una consulta pendiente, una consulta fallida y una lista sin tareas visibles. En un espacio sin tareas SHALL explicar el propósito de la lista y ofrecer crear la primera. Los errores SHALL ser comprensibles y estar en castellano.

#### Scenario: Primera consulta pendiente
- **WHEN** la lista aún espera la respuesta de su primera consulta
- **THEN** se muestra un estado de carga y no se afirma que el espacio esté vacío.

#### Scenario: Espacio sin tareas
- **WHEN** la consulta tiene éxito en un espacio donde todavía no se han creado tareas
- **THEN** se explica qué muestra la lista y se ofrece crear la primera tarea.

#### Scenario: Fallo de consulta
- **WHEN** falla la consulta inicial de la lista
- **THEN** se muestra un aviso de error y una acción de reintento manual, en lugar de presentarlo como ausencia de tareas; no se reintenta automáticamente.

### Requirement: Acceso desde la interfaz existente

La interfaz SHALL ofrecer acceso a la lista desde el perfil autenticado, conservando el destino `/profile` tras login y registro. La navegación a la lista y el flujo de creación SHALL ser operables por teclado.

#### Scenario: Acceso tras login o registro
- **WHEN** una persona llega al perfil tras completar login o registro
- **THEN** puede acceder a la lista mediante una acción visible sin que cambie el destino inicial al perfil.

#### Scenario: Uso por teclado
- **WHEN** una persona autenticada usa únicamente el teclado
- **THEN** puede acceder a la lista, escribir un título, crear una tarea y leer los errores asociados al campo.
