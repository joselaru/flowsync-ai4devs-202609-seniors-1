# Tasks

## 1. Base de datos y dominio mínimo

- [x] 1.1 Aislar la base SQLite del entorno de pruebas y preparar migraciones/limpieza usando la infraestructura Japa existente; verificar que los tests utilizan un fichero distinto de `tmp/db.sqlite3` de desarrollo y que una ejecución no altera sus datos.
- [x] 1.2 Crear la migración de `tasks` con título, responsable obligatorio, tres estados permitidos y fechas, y generar el esquema mediante `node ace migration:run`; verificar en una base aislada que la migración y su rollback funcionan y que `TaskSchema` se genera sin edición manual.
- [x] 1.3 Añadir el modelo Task y su relación con User siguiendo los subpath imports; verificar mediante pruebas de persistencia y relación que una tarea conserva título y responsable y que la base rechaza un estado fuera de los tres permitidos. Ejecutar `npm run typecheck` desde `backend/`.
- [x] 1.4 Documentar en `docs/crear-y-consultar-tareas.md` el esquema mínimo, la preparación de tests aislados y la pérdida de datos al revertir la migración; verificar que las instrucciones coinciden con la configuración implementada y no requieren modificar datos de desarrollo.

## 2. API de creación

- [x] 2.1 Añadir validación VineJS de título requerido, no compuesto solo por espacios y de hasta 255 unidades UTF-16, sin trim, normalización ni truncamiento; verificar con pruebas funcionales títulos ausentes, vacíos, en blanco, tipos no válidos, límites 255/256, conservación y conteo de espacios exteriores y casos de 253/254 letras básicas más `😀`.
- [x] 2.2 Añadir `POST /api/v1/tasks` protegido, tomando responsable de la sesión y estado Pendiente, con transformer mínimo y respuesta `201` envuelta en `data`; verificar con pruebas funcionales creación persistente, valores por defecto, cuentas distintas, `401` sin credencial válida y ausencia de email, contraseña, tokens y fechas de cuenta en la representación del responsable.
- [x] 2.3 Procesar solo `title` e ignorar campos adicionales, incluidos responsable y estado, sin rechazar un título válido por esas claves; verificar con casos funcionales respuesta `201`, responsable autenticado y estado `pending` tras esos intentos, sin introducir endpoints de modificación.
- [x] 2.4 Regenerar el registro de controladores y tipos cliente por el boot o las pruebas, y documentar contrato de creación, `201`, envoltorio `data`, estados públicos, nombre nullable, campos ignorados, conservación del título y medida UTF-16 en `docs/crear-y-consultar-tareas.md`; verificar la representación definida en la spec, los errores `422` por título inválido y que las pruebas de creación, lint y typecheck del backend pasan.

## 3. API de consulta compartida

- [x] 3.1 Añadir `GET /api/v1/tasks` protegido, con responsables precargados, Pendiente y En curso visibles y orden `created_at DESC, id DESC`; verificar con pruebas funcionales respuesta `200` y `{ data: Task[] }`, campos del contrato y estados públicos, lectura por dos cuentas del mismo conjunto, lista vacía, exclusión de Hecho, representación mínima y ausencia de restricciones por propietario.
- [x] 3.2 Añadir pruebas de orden con fechas distintas y empates, acceso con token ausente o inválido y consulta sin mutaciones de tareas; verificar que todos los casos pasan y que no se incorporan filtros configurables, detalle ni controles de estado.
- [x] 3.3 Actualizar el registro generado y la sección de consulta en `docs/crear-y-consultar-tareas.md`, explicando que la lista inicial no es una lista viva ni permite consultar Hecho mediante filtro; verificar los ejemplos contra la API y ejecutar las pruebas funcionales, lint y typecheck del backend.

## 4. Cliente y acceso a la pantalla

- [x] 4.1 Añadir tipos de tareas y métodos `getTasks`/`createTask` en el cliente centralizado, con Bearer, desenvoltura de `data` y errores de título traducidos; verificar desde la interfaz peticiones correctas, traducción de un `422` de título y aviso de conexión. Ejecutar build y lint desde `frontend/`.
- [x] 4.2 Añadir `/tasks` bajo el guard existente, enlace visible desde el perfil y regreso al perfil desde tareas; verificar con navegador que una persona autenticada puede usar los enlaces y que una anónima es dirigida a login sin ver tareas. Confirmar que login y registro siguen conduciendo a `/profile`.
- [x] 4.3 Registrar en `docs/crear-y-consultar-tareas.md` el recorrido perfil-lista y los resultados de las comprobaciones de navegación; verificar que se puede repetir con una cuenta nueva y sin alterar las redirecciones descritas por `cuentas-y-acceso`.

## 5. Lista y formulario de creación

- [x] 5.1 Implementar consulta inicial con estados de carga, error con reintento manual y ausencia de filas con explicación y oferta de creación; verificar en navegador consulta lenta, servidor no disponible, espacio vacío y lista con tareas ajenas, sin confundir fallo con ausencia de tareas ni emitir reintentos automáticos. Confirmar que el formulario permanece deshabilitado durante carga/fallo inicial y se habilita tras consulta o reintento exitoso, incluso con lista vacía.
- [x] 5.2 Mostrar título, nombre del responsable o «Sin nombre» y etiqueta de estado, en orden descendente y sin agrupación; verificar con dos responsables, uno sin nombre, que la lista no muestra email ni fechas de cuenta y que las filas no ofrecen detalle, filtro, edición ni cambios de estado.
- [x] 5.3 Implementar formulario solo de título, estados de envío, errores inline y preservación exacta del texto tras fallo; verificar por teclado y con respuestas fallidas que no se solicita otro dato, no se permite un segundo envío mientras el primero está pendiente y se puede corregir o reintentar manualmente conservando el título, sin reenvío automático ni truncamiento silencioso en el input.
- [x] 5.4 Incorporar la tarea devuelta al confirmar creación sin recarga, ordenarla de forma consistente y limpiar el campo solo tras éxito; verificar creación de varias tareas y que consultas o respuestas pendientes no sobrescriben resultados propios ni se aplican después de desmontar o cambiar sesión.
- [x] 5.5 Documentar y ejecutar la comprobación de UI en `docs/crear-y-consultar-tareas.md`: teclado, foco/errores de campo, límite UTF-16 255/256 con emoji y espacios, fallback de nombre, creación visible, bloqueo durante carga/fallo inicial y recuperación manual de consulta/alta conservando el título; registrar resultados y procedencia de las decisiones delegadas, y verificar build y lint del frontend sin instalar un runner nuevo implícitamente.

## 6. Integración del incremento

- [x] 6.1 Comprobar el recorrido completo con dos cuentas: A crea, ve la tarea al confirmarse y B la obtiene al entrar o recargar; verificar que B no recibe cambios automáticamente mientras permanece en la pantalla y que logout y navegación posterior siguen protegiendo ambas vistas.
- [x] 6.2 Ejecutar tests funcionales, lint y typecheck desde `backend/`, y build y lint desde `frontend/`; verificar registros generados consistentes y registrar los resultados de integración junto a las limitaciones explícitas del incremento.
- [x] 6.3 Contrastar la implementación con todos los escenarios del delta y comprobar el alcance del diff; verificar que no se han añadido filtro, actualización automática, detalle, fechas, mutaciones adicionales ni cambios a los requisitos de `cuentas-y-acceso`, y que `openspec validate crear-y-consultar-tareas --strict` pasa.
