# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---


**Modelo:** GPT 5.6 sol (medium)
**Herramienta:** OpenCode


## Prompt 1
```
Quiero conocer que es lo existente y que problema resuelve, debe investigarlo en el repositorio o codigo actual, busca documentación  y no quiero que implementes ni tomes decisiones y si tienes alguna duda prguntármela 
```

## Prompt 2
```
Quiero que me indique que preguntas necesitaría responderte para resolver el problema de la falta de visibilidad entre equipos remotos

** Respondo a las preguntas
```

## Prompt 3
```
Consolida el alcance del  MVP para resolver el problema de visibilidad de tareas en progreso en equipos remotos,een base a las preguntas respondidas, no toques nada de código y ante cualquier duda o inconsistencia pregunta

** Respondo a las preguntas y me devuelve info en un /docs/prd alcance-mvp.md
```

## Prompt 4
```
En base al fichero alcance-mpv.md genera un PRD de producto claro preguntándome antes todo aquello que te pueda generar duda para hacer el PRD

** Genera el /docs/prd prd.md
```

## Prompt 5
```
Basándote en los documentos anteriores dame varias ideas de épicas para yo elegir una

** Me quedo con épica:
Consultar el trabajo de un compañero
Objetivo: evitar interrupciones permitiendo consultar en qué trabaja otro miembro del equipo.
Incluye:
- Seleccionar un miembro del mismo equipo.
- Mostrar todas sus tareas en progreso.
- Mostrar nombre y fecha prevista de cada tarea.
- Informar claramente cuando no tenga tareas activas.
- No mostrar tareas finalizadas.
Valor: responde directamente al problema principal del MVP.

```

## Prompt 6
```
Me quedo con la épica 2, “Consultar el trabajo de un compañero”. Basándote en el PRD y en esa épica, propón las historias de usuario en las que debería descomponerse, sin ampliar el alcance. Si necesitas tomar alguna decisión de producto que no esté definida, pregúntamela antes.

** Como da criterios de aceptación obtengo poke holes y matizo lo que afecta al MVP

```

## Prompt 7
```
Consolida la HU2 con sus criterios de aceptación aceptados y dime como queda

** Quedando asi :
HU2 — Consultar las tareas en progreso de un compañero
Como miembro de un equipo remoto,  
quiero consultar las tareas en progreso de un compañero de mi equipo,  
para saber en qué está trabajando sin tener que interrumpirlo.
Criterios de aceptación
 1. La consulta solo puede realizarse sobre un miembro del mismo equipo previamente seleccionado.
 2. Mientras se obtiene la información, debe mostrarse claramente que la consulta está en curso.
 3. Si la consulta falla, debe mostrarse un estado de error claramente diferenciado.
 4. Si el compañero tiene tareas en progreso, deben mostrarse todas, sin aplicar un límite funcional.
 5. De cada tarea debe mostrarse únicamente:
- Nombre.
- Fecha prevista de finalización.
 6. La fecha debe utilizar un formato uniforme y no ambiguo. El formato concreto no se define en esta historia.
 7. No se requiere un orden específico para mostrar las tareas.
 8. No deben mostrarse tareas finalizadas.
 9. Una tarea cuya fecha prevista haya vencido debe seguir mostrándose mientras su propietario no la marque como finalizada.
10. Si el compañero no tiene tareas en progreso, debe mostrarse claramente un resultado sin tareas, diferenciado de los estados de carga y error.
11. Pueden existir varias tareas con el mismo nombre y deben mostrarse como elementos independientes.
12. No debe mostrarse información de tareas pertenecientes a otros miembros.
```

## Prompt 8
```
Teniendo como fuente HU2 y sus criterios de aceptación finales, propón los tickets necesarios para implementarla. No amplíes el alcance ni inventes nuevos requisitos. Si para crear los tickets necesitas alguna decisión que no esté definida, pregúntamela antes

** Me propone:
Tickets para implementar HU2
Ticket 1 — Habilitar la representación de equipos, miembros y tareas
Objetivo: disponer de la información mínima necesaria para consultar las tareas de miembros del mismo equipo.
Alcance:
- Representar equipos ya existentes.
- Asociar cada usuario a un único equipo.
- Representar tareas asociadas a su propietario.
- Conservar para cada tarea:
- Nombre.
- Fecha prevista de finalización.
- Situación: en progreso o finalizada.
- Permitir nombres de tarea duplicados.
- No incluir gestión de equipos, miembros ni tareas.
Criterios de aceptación:
- Se puede determinar a qué equipo pertenece un usuario.
- Se puede determinar quién es el propietario de una tarea.
- Se pueden distinguir tareas en progreso y finalizadas.
- Una fecha vencida no cambia automáticamente el estado de una tarea.
- Dos tareas con el mismo nombre se conservan como tareas independientes.
Ticket 2 — Exponer la consulta de tareas en progreso de un compañero
Objetivo: permitir al usuario autenticado consultar las tareas activas de un miembro de su equipo.
Alcance:
- Recibir la identificación del miembro previamente seleccionado.
- Comprobar que pertenece al mismo equipo que el usuario autenticado.
- Obtener todas sus tareas en progreso.
- Excluir las tareas finalizadas.
- Devolver únicamente el nombre y la fecha prevista de cada tarea.
Criterios de aceptación:
- La consulta requiere un usuario autenticado.
- Solo permite consultar miembros del mismo equipo.
- Una consulta sobre un miembro ajeno no devuelve información de sus tareas.
- Devuelve todas las tareas en progreso, sin límite funcional ni paginación.
- No aplica un orden específico.
- Incluye tareas cuya fecha prevista ya haya vencido si continúan en progreso.
- Excluye todas las tareas finalizadas.
- Las tareas con nombres iguales aparecen como resultados independientes.
- Una consulta válida sin tareas devuelve correctamente una colección vacía.
- Los fallos de consulta se distinguen de una respuesta válida sin tareas.
Ticket 3 — Integrar la consulta en el cliente frontend
Objetivo: conectar el frontend con la consulta de tareas del miembro seleccionado.
Alcance:
- Añadir la operación de consulta al punto central de acceso a la API.
- Solicitar las tareas del miembro recibido desde el flujo de selección.
- Gestionar los resultados y errores de la consulta.
Criterios de aceptación:
- La consulta utiliza la sesión del usuario autenticado.
- El frontend puede distinguir:
- Consulta en curso.
- Consulta completada con tareas.
- Consulta completada sin tareas.
- Consulta errónea.
- Los errores del backend no se interpretan como una lista vacía.
- No se añaden actualización automática, paginación ni ordenación.
Ticket 4 — Mostrar las tareas en progreso del compañero
Objetivo: presentar al usuario el resultado de la consulta de manera clara.
Alcance:
- Mostrar el estado de carga.
- Mostrar el estado de error.
- Mostrar el resultado con tareas.
- Mostrar el resultado sin tareas.
Criterios de aceptación:
- Mientras la consulta está en curso, se muestra un indicador de carga.
- Si la consulta falla, se muestra un estado de error diferenciado.
- Si existen tareas, se muestran todas.
- Cada tarea muestra únicamente:
- Nombre.
- Fecha prevista de finalización.
- La fecha utiliza un formato uniforme y no ambiguo, sin fijar en este ticket el formato concreto.
- Las tareas con el mismo nombre se muestran como elementos independientes.
- Las tareas vencidas siguen apareciendo mientras estén en progreso.
- Si no existen tareas en progreso, se muestra claramente un estado sin tareas.
- No se muestra información de otros miembros.
Dependencias y exclusiones
- La selección concreta del compañero pertenece a la HU1; HU2 recibe un miembro ya seleccionado.
- La actualización automática queda excluida de estos tickets.
- No se incluye creación, edición o finalización de tareas.
- No se incluye administración de equipos o miembros.

```

## Prompt 9
```
Acepta lo 4 ticket, llévalos a Jira mediante MCP, pero antes dime como lo harás y si tienes alguna dud
```

## Prompt 10
Acepta los ticket
