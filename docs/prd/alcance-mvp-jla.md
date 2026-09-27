# Alcance del MVP de FlowSync

## Problema

Los miembros de equipos remotos interrumpen a sus compañeros para averiguar en qué están trabajando. Estas consultas dificultan la concentración y generan reuniones o mensajes de sincronización evitables.

## Usuarios

Miembros de equipos remotos ya existentes. El MVP presupone que los equipos y sus integrantes están disponibles, pero no incluye su creación ni administración.

## Propuesta de valor

Permitir que un miembro consulte las tareas en progreso de un compañero, junto con sus fechas previstas de finalización, sin tener que interrumpirlo.

## Alcance

1. Seleccionar un miembro del mismo equipo; la forma concreta de selección queda pendiente.
2. Consultar exclusivamente las tareas en progreso de la persona seleccionada.
3. Mostrar, para cada tarea, su nombre y fecha prevista de finalización.
4. Permitir que cada usuario registre y mantenga sus propias tareas.
5. Permitir que el usuario marque una tarea como finalizada, momento en el que deja de aparecer como tarea en progreso.
6. Admitir que una persona tenga varias tareas en progreso simultáneamente.
7. Validar externamente si los usuarios reciben menos interrupciones para preguntar en qué trabajan sus compañeros.

## Fuera del alcance

- **Crear o administrar equipos y miembros**, porque se parte de equipos ya existentes y no ayuda a validar la reducción de interrupciones.
- **Consultar tareas de otros equipos**, porque el problema definido se limita a la visibilidad dentro del mismo equipo.
- **Mostrar tareas finalizadas o un historial**, porque el MVP solo necesita responder qué está haciendo una persona actualmente.
- **Estados adicionales a “en progreso” y “finalizada”**, porque no son necesarios para validar la visibilidad del trabajo actual.
- **Asignar o modificar tareas de otras personas**, porque cada usuario es responsable de mantener su propia información.
- **Prioridades, descripciones, comentarios, archivos y subtareas**, porque el nombre y la fecha prevista constituyen la información mínima acordada.
- **Notificaciones, recordatorios y actualizaciones automáticas**, porque el usuario actualizará sus tareas manualmente.
- **Integraciones con otras herramientas**, porque no son necesarias para comprobar si la visibilidad reduce las interrupciones.
- **Paneles generales, métricas de productividad o seguimiento del rendimiento**, porque el objetivo es consultar el trabajo de una persona concreta, no evaluar al equipo.
- **Encuestas dentro de FlowSync**, porque la reducción de interrupciones se medirá externamente.
