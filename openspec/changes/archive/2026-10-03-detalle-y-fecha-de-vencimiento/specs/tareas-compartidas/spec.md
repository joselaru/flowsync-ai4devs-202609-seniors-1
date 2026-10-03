# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
