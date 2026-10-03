# tareas-compartidas Specification

## Purpose

Permitir a las personas autenticadas registrar tareas con un título y consultar una lista inicial del trabajo compartido, con responsable y estado visibles. Esta entrega establece la base de tareas sin incorporar la actualización automática ni otras capacidades posteriores del MVP.

## Requirements

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

La API SHALL conservar POST y GET `/api/v1/tasks` y añadir GET `/api/v1/tasks/:id` y PATCH `/api/v1/tasks/:id/due-date`, autenticados y con éxito envuelto en `data`. Creación/colección SHALL conservar `{ id, title, status, createdAt, assignee: { fullName } }`, nombre nullable y estados `pending`, `in_progress`, `done`. El detalle SHALL añadir `dueDate`; PATCH SHALL procesar solo `dueDate`, `expectedDueDate` y `expectedStatus`, los dos últimos como referencia consultada.

#### Scenario: Respuesta de creación
- **WHEN** se envía `POST /api/v1/tasks` con un título válido y autenticación válida
- **THEN** se responde con `201` y `{ data: task }`, con los campos definidos y estado `pending`.

#### Scenario: Respuesta de consulta
- **WHEN** se envía `GET /api/v1/tasks` con autenticación válida
- **THEN** se responde con `200` y `{ data: tasks }`, donde `tasks` es un array de tareas con los campos definidos y estados `pending` o `in_progress`.

#### Scenario: Validación fallida
- **WHEN** una solicitud autenticada de creación contiene un título inválido
- **THEN** se responde con `422` y errores de validación asociados a `title`, sin crear la tarea.

#### Scenario: Consulta o actualización individual
- **WHEN** una persona autenticada consulta una tarea existente o guarda su fecha con referencia coincidente
- **THEN** se responde `200` con `{ data: detail }`, incluidos los campos públicos de tarea y `dueDate` como día canónico o `null`, sin revisión monotónica ni vencimiento global.

#### Scenario: Actualización limitada
- **WHEN** se envía fecha y referencia válidas junto con campos de título, responsable o estado a modificar
- **THEN** se procesa únicamente `dueDate`, `expectedDueDate` y `expectedStatus` y no se modifica ningún otro dato de producto.

#### Scenario: Referencia o campo ausente
- **WHEN** falta `dueDate`, `expectedDueDate` o `expectedStatus`, o la fecha de referencia o el estado de referencia no son válidos
- **THEN** se responde `422` con errores asociados al campo sin modificar la tarea.

#### Scenario: Tarea inexistente
- **WHEN** se consulta o actualiza un identificador válido de tarea inexistente
- **THEN** la API responde `404` y la interfaz informa que la tarea no existe sin presentarla como detalle vacío ni como guardado correcto.

#### Scenario: Privacidad y colección
- **WHEN** se consulta el detalle o la colección
- **THEN** no se exponen email, contraseñas, tokens ni fechas de cuenta; la colección conserva su representación anterior sin fecha de vencimiento.

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

### Requirement: Detalle autenticado y mínimo

El sistema SHALL permitir abrir una tarea desde la lista y volver a ella por teclado o ratón. El detalle SHALL exigir sesión válida y mostrar título, responsable y estado solo para consulta, con fecha como único dato editable. SHALL permitir consultar tareas propias o ajenas, también Hecho por acceso individual, sin modificar datos al abrirlas.

#### Scenario: Abrir y volver
- **WHEN** una persona autenticada abre una tarea visible usando teclado o ratón y vuelve sin editar
- **THEN** consulta título, responsable y estado, puede regresar a la lista y la tarea no cambia.

#### Scenario: Tarea ajena o hecha
- **WHEN** una persona autenticada consulta por su identificador una tarea ajena o en Hecho
- **THEN** obtiene el detalle sin restricción por responsable o estado; el nombre nulo se presenta como «Sin nombre» sin email.

#### Scenario: Visita sin sesión
- **WHEN** una persona anónima intenta acceder al detalle o su API
- **THEN** la interfaz dirige a login sin mostrar datos y la API responde `401`.

### Requirement: Fecha opcional sin ampliación del alta ni de la lista

El sistema SHALL crear tareas sin fecha y permitir establecer, cambiar o retirar su fecha solo en el detalle. SHALL mantener el alta con solo título, la lista sin fechas ni marcas de vencimiento y la ausencia de fecha como un estado normal sin advertencias.

#### Scenario: Alta y lista conservadas
- **WHEN** se crea una tarea indicando título, incluso con un campo adicional de fecha, y se consulta la lista
- **THEN** nace sin fecha, el campo adicional se ignora y ni el alta ni la lista muestran o sugieren fechas o vencimiento; el orden de creación se conserva.

#### Scenario: Establecer y retirar
- **WHEN** una persona cambia la fecha de cualquier tarea a un día válido o la deja sin fecha y guarda
- **THEN** se persiste ese valor sin cambiar título, responsable o estado; retirar una fecha elimina su condición de vencida.

### Requirement: Fecha civil válida

La fecha SHALL representar un día de calendario, sin hora ni conversión de huso. La API SHALL aceptar `dueDate` como `null` o fecha gregoriana real en `YYYY-MM-DD`, con año de cuatro cifras entre 0001 y 9999. SHALL aceptar fechas pasadas en cualquier estado y rechazar fechas imposibles, incompletas o valores de otro tipo sin modificar datos.

#### Scenario: Fecha pasada
- **WHEN** se guarda una fecha pasada en Pendiente, En curso o Hecho
- **THEN** se acepta y conserva el día elegido; Hecho no se muestra vencida.

#### Scenario: Fecha inválida
- **WHEN** se intenta guardar una fecha imposible, incompleta, timestamp, texto no canónico o tipo inválido
- **THEN** la API responde `422` asociado a `dueDate`, no modifica la tarea y la interfaz conserva la edición con error en castellano junto al campo.

#### Scenario: Conservación entre husos
- **WHEN** personas en husos distintos consultan la fecha guardada
- **THEN** ven el mismo día de calendario elegido, sin desplazamiento por UTC.

### Requirement: Guardado explícito y edición separada

La interfaz SHALL mantener separados el valor guardado y el borrador. Solo una acción explícita de guardar SHALL enviar la edición; el éxito SHALL confirmar la fecha y limpiar la condición de cambios pendientes. Durante el guardado SHALL impedir envíos duplicados. La señal de vencimiento SHALL usar los valores guardados, no el borrador.

#### Scenario: Editar no guarda
- **WHEN** se cambia o vacía el campo sin guardar
- **THEN** la fecha persistida y su señal de vencimiento permanecen como antes.

#### Scenario: Confirmación de guardado
- **WHEN** el guardado explícito tiene éxito
- **THEN** la fecha y su señal se actualizan sin recarga ni reapertura y la edición queda confirmada.

#### Scenario: Guardado pendiente
- **WHEN** una solicitud de guardado está pendiente y se intenta guardar otra vez
- **THEN** no se emite una segunda solicitud ni se presenta la primera como confirmada.

### Requirement: Descarte consciente al salir

Cuando no haya guardado en curso, la interfaz SHALL pedir confirmación al abandonar el detalle si el borrador difiere de la fecha guardada. SHALL permitir permanecer o salir descartando sin guardar automáticamente. SHALL cubrir navegación interna y atrás/adelante; recarga o cierre SHALL solicitar aviso nativo cuando el navegador lo permita.

#### Scenario: Permanecer o descartar
- **WHEN** se intenta salir con cambios sin guardar y sin solicitud de guardado pendiente
- **THEN** se ofrece permanecer conservando la edición o salir sin persistirla; sin cambios no se pide confirmación.

#### Scenario: Salida del navegador
- **WHEN** se recarga o cierra la página con cambios pendientes después de interacción con ella
- **THEN** se solicita confirmación nativa de abandono, sin prometer personalizar su texto ni impedir un cierre forzado.

#### Scenario: Guardado en curso
- **WHEN** se intenta abandonar el detalle mediante controles de la aplicación o atrás/adelante mientras hay un guardado pendiente
- **THEN** la salida queda bloqueada hasta que finalice; recarga o cierre solicitan aviso nativo cuando sea posible, sin garantizar impedir cierre forzado o pérdida de sesión.

### Requirement: Vencimiento según el día de quien mira

La interfaz SHALL mostrar la etiqueta textual «Vencida» si y solo si la fecha guardada es anterior al día local del navegador/dispositivo y el estado guardado no es Hecho. SHALL reevaluar al cambiar el día local y al recuperar la pestaña tras suspensión, sin alterar el borrador ni consultar automáticamente cambios ajenos.

#### Scenario: Bordes de calendario y estado
- **WHEN** se abre una tarea con fecha ausente, de ayer, de hoy o futura
- **THEN** solo la fecha anterior a hoy en Pendiente o En curso produce «Vencida»; Hecho nunca, y sin fecha no genera advertencia.

#### Scenario: Dos días locales
- **WHEN** dos personas consultan la misma fecha con días locales distintos
- **THEN** cada una obtiene el vencimiento según su propio día, pudiendo diferir correctamente sin cambiar la tarea.

#### Scenario: Medianoche y suspensión
- **WHEN** el detalle permanece abierto al avanzar el día local o se recupera una pestaña suspendida
- **THEN** se recalcula la condición sobre fecha y estado guardados, preservando la edición y sin petición de actualización ajena.

#### Scenario: Condición sobre estado actualizado
- **WHEN** una consulta explícita obtiene una tarea Hecho con fecha pasada
- **THEN** la etiqueta desaparece sin alterar la fecha; el detalle no permite cambiar el estado.

### Requirement: Protección de conflictos de fecha y estado

El guardado SHALL comparar fecha y estado actuales con los valores consultados y rechazar diferencias sin sobrescribir. La comparación y escritura SHALL ser atómicas. No SHALL exigirse detectar cambios intermedios revertidos al valor consultado (ABA). La interfaz SHALL avisar en castellano, conservar el borrador y bloquear nuevos guardados hasta consultar los valores actuales.

#### Scenario: Dos ediciones concurrentes
- **WHEN** dos personas guardan fechas distintas entre sí y distintas de la fecha previa desde la misma referencia
- **THEN** solo un guardado puede aplicar sobre esa referencia y el otro responde `409` sin sobrescribir el primero.

#### Scenario: Cambio de estado
- **WHEN** cambia el estado después de consultar y se intenta guardar una fecha con esa referencia
- **THEN** se responde `409`, se conserva el estado actual y no se guarda la fecha propuesta.

### Requirement: Recuperación manual del conflicto

La interfaz SHALL ofrecer «Consultar cambios» después de un conflicto. Esa acción SHALL obtener los valores guardados actuales conservando aparte el borrador. Aplicarlo SHALL requerir revisar y guardar explícitamente otra vez, comprobando nuevos conflictos; nunca consultar SHALL guardar, forzar sobrescritura ni reintentar automáticamente.

#### Scenario: Consultar y decidir
- **WHEN** tras conflicto se elige «Consultar cambios»
- **THEN** se muestran fecha y estado guardados actuales y la edición conservada; se puede descartarla o realizar un nuevo guardado explícito.

#### Scenario: Descartar solo la edición
- **WHEN** tras consultar los cambios la persona elige «Descartar edición»
- **THEN** el borrador adopta la fecha consultada, no se envía guardado, se limpia la condición de cambios pendientes y permanece en el detalle.

#### Scenario: Nuevo conflicto o fallo de consulta
- **WHEN** la consulta de recuperación falla o la fecha o el estado actuales difieren de los recuperados al intentar el nuevo guardado
- **THEN** el borrador no se pierde; un fallo permite reintentar manualmente la consulta y un cambio posterior vuelve a rechazar el guardado sin sobrescribir.

### Requirement: Fallos recuperables sin confirmación falsa

Ante fallo de conexión o servidor la interfaz SHALL conservar el borrador y el último valor confirmado, mostrar un aviso comprensible y permitir recuperación manual. SHALL mantener protección de salida mientras haya cambios, no reenviar automáticamente y no aplicar respuestas de una tarea o sesión anterior.

#### Scenario: Fallo de guardado
- **WHEN** falla el guardado por conexión o servidor
- **THEN** no se muestra éxito, se conserva la edición y puede reintentarse manualmente; no se garantiza que una respuesta perdida implique ausencia de persistencia.

#### Scenario: Respuesta tardía
- **WHEN** se resuelve una consulta o guardado después de abandonar el detalle o cambiar de tarea o sesión
- **THEN** no contamina los datos ni la edición de la vista actual.
