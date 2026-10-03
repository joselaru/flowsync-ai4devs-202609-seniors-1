# Spec viva: registro, inicio de sesión, sesión, perfil y cierre de sesión

## Purpose

Describir cómo FlowSync permite crear una cuenta, autenticarse, recuperar la sesión al cargar la aplicación, consultar el perfil y cerrar la sesión **según la implementación existente**. Esta especificación brownfield captura comportamientos comprobables y sirve como contrato de referencia para futuras modificaciones.

Base analizada: commit `a58a01880b0bc14b55d0468cc09b82564599a81c`. Los requisitos con **SHALL** expresan el comportamiento actual, no funcionalidades propuestas. Los escenarios incluyen sus precondiciones y resultados observables; las referencias de evidencia remiten al código que los implementa.

### Evidencia y alcance de la comprobación

- Se han inspeccionado rutas, controladores, validadores, modelo, transformer, serializador, middleware, migraciones y el flujo completo del frontend.
- Se ha ejecutado una comprobación aislada con la versión de VineJS instalada desde `backend/package-lock.json`: omitir `fullName` produce `required` con estado 422; `null`, cadena vacía y cadena con espacios se aceptan como valores de ese campo. Esto no constituye una prueba HTTP del registro completo.
- Los demás escenarios se derivan por lectura del código; no se presentan como pruebas end-to-end ejecutadas. En `backend/tests/` solo existe `bootstrap.ts`, sin casos de autenticación automatizados. El frontend no declara un runner de tests.
- «Sesión» designa aquí el token de acceso y el estado del frontend. El guard por defecto es `api`; aunque existe un guard `web` y middleware de sesión, las rutas estudiadas utilizan autenticación por token.

### Referencias de evidencia

Las referencias E01–E16 se utilizan en cada requisito. Los enlaces son relativos a este documento.

| ID  | Código fuente                                                                                                                                                                                                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E01 | [Rutas API](../../backend/start/routes.ts), [kernel](../../backend/start/kernel.ts), [guard](../../backend/config/auth.ts), [middleware auth](../../backend/app/middleware/auth_middleware.ts), [silent auth](../../backend/app/middleware/silent_auth_middleware.ts)                                                 |
| E02 | [Validadores de usuario](../../backend/app/validators/user.ts)                                                                                                                                                                                                                                                        |
| E03 | [Registro](../../backend/app/controllers/new_account_controller.ts)                                                                                                                                                                                                                                                   |
| E04 | [Login y logout](../../backend/app/controllers/access_tokens_controller.ts)                                                                                                                                                                                                                                           |
| E05 | [Consulta de perfil](../../backend/app/controllers/profile_controller.ts), [transformer](../../backend/app/transformers/user_transformer.ts), [serializador](../../backend/providers/api_provider.ts)                                                                                                                 |
| E06 | [Modelo User e iniciales](../../backend/app/models/user.ts), [hash](../../backend/config/hash.ts), [schema generado](../../backend/database/schema.ts)                                                                                                                                                                |
| E07 | [Migración de usuarios](../../backend/database/migrations/1761885935168_create_users_table.ts), [migración de tokens](../../backend/database/migrations/1768620764696_create_access_tokens_table.ts)                                                                                                                  |
| E08 | [Cliente API y traducción de errores](../../frontend/src/lib/api.ts), [tipos](../../frontend/src/lib/types.ts)                                                                                                                                                                                                        |
| E09 | [Proveedor de autenticación](../../frontend/src/auth/auth-provider.tsx)                                                                                                                                                                                                                                               |
| E10 | [Formulario de registro](../../frontend/src/pages/register-page.tsx)                                                                                                                                                                                                                                                  |
| E11 | [Formulario de login](../../frontend/src/pages/login-page.tsx)                                                                                                                                                                                                                                                        |
| E12 | [Gestión de formularios](../../frontend/src/auth/use-auth-form.ts), [error de campo](../../frontend/src/components/field-error.tsx)                                                                                                                                                                                   |
| E13 | [Rutas frontend](../../frontend/src/routes/app-routes.tsx), [ruta protegida](../../frontend/src/routes/protected-route.tsx), [ruta pública](../../frontend/src/routes/public-only-route.tsx), [loader](../../frontend/src/components/full-screen-loader.tsx)                                                          |
| E14 | [Pantalla de perfil](../../frontend/src/pages/profile-page.tsx)                                                                                                                                                                                                                                                       |
| E15 | [Respuesta JSON forzada](../../backend/app/middleware/force_json_response_middleware.ts), [handler de errores](../../backend/app/exceptions/handler.ts)                                                                                                                                                               |
| E16 | Dependencia fijada en [lockfile](../../backend/package-lock.json): `@adonisjs/auth`, implementación instalada en `build/src/mixins/lucid.js`, `build/errors-*.js` y `build/modules/access_tokens_guard/main.js`; VineJS instalado en `@vinejs/vine/build/index.js`. Estas rutas de dependencias no están versionadas. |

## Requirements

### Requirement AUTH-01 — Acceso a los endpoints

La API **SHALL** permitir registro e inicio de sesión sin autenticación y exigir autenticación con el guard `api` para consultar el perfil o cerrar sesión. Evidencia: E01, E15, E16.

#### Scenario — Operaciones públicas

- **WHEN** un cliente sin token envía `POST /api/v1/auth/signup` o `POST /api/v1/auth/login`.
- **THEN** la petición llega al controlador correspondiente y se somete a su validación, sin exigir una sesión previa.

#### Scenario — Operación protegida sin autenticación válida

- **WHEN** un cliente consulta `GET /api/v1/account/profile` o envía `POST /api/v1/account/logout` sin token, con un token inválido o con uno revocado.
- **THEN** la API responde 401 en JSON y no ejecuta la operación del controlador.

### Requirement AUTH-02 — Validación del registro

La API **SHALL** validar `fullName` como cadena nullable obligatoriamente presente, `email` como cadena con formato de email y máximo 254 caracteres, única en `users.email`, y `password` y `passwordConfirmation` como cadenas de 8 a 32 caracteres coincidentes. Evidencia: E02, E07, E16.

#### Scenario — Registro sin nombre

- **WHEN** se envían `fullName: null`, un email válido no registrado y contraseñas coincidentes de 8 a 32 caracteres.
- **THEN** los campos satisfacen las reglas de registro; la ausencia de un nombre no impide crear la cuenta.

#### Scenario — Clave de nombre omitida

- **WHEN** el payload de registro omite `fullName` y el resto de los campos es válido.
- **THEN** la validación devuelve 422 con un error `required` para `fullName`; nullable no equivale a permitir omitir la clave.

#### Scenario — Email ya registrado

- **WHEN** se envía un email que ya existe en `users.email` y los demás campos son válidos.
- **THEN** la validación devuelve 422 con un error `database.unique` para `email`, antes de crear el usuario o su token.

#### Scenario — Campos inválidos

- **WHEN** falta un campo no nullable, el email no cumple su formato o supera 254 caracteres, una contraseña queda fuera de 8–32 caracteres o la confirmación no coincide.
- **THEN** la validación devuelve 422 con errores por campo y no se ejecuta la creación de la cuenta.

### Requirement AUTH-03 — Envío del formulario de registro

El formulario de `/register` **SHALL** ofrecer nombre opcional, email, contraseña y confirmación; recortar el nombre y enviar `null` si queda vacío; y comprobar localmente la coincidencia de contraseñas antes de llamar a la API. Evidencia: E10.

#### Scenario — Nombre vacío o compuesto solo por espacios

- **WHEN** se envía el formulario con contraseñas iguales y el nombre vacío o formado solo por espacios.
- **THEN** se envía `fullName: null`; el email y las contraseñas se envían tal como están en el estado del formulario.

#### Scenario — Nombre con espacios en los extremos

- **WHEN** se envía el formulario con nombre `" Ada Lovelace "` y contraseñas iguales.
- **THEN** la petición contiene `fullName: "Ada Lovelace"`.

#### Scenario — Contraseñas diferentes en la interfaz

- **WHEN** se intenta enviar el formulario con contraseñas distintas.
- **THEN** aparece «Las contraseñas no coinciden.» junto a la confirmación y no se llama a la API de registro.

### Requirement AUTH-04 — Cuenta y sesión tras el registro

Ante un registro válido, el backend **SHALL** crear el usuario y un token de acceso, devolver `{ data: { user, token } }`, y el frontend **SHALL** iniciar la sesión con esa respuesta. Evidencia: E03, E05, E06, E09, E13, E16.

#### Scenario — Alta completada

- **WHEN** se completa el registro válido desde `/register`.
- **THEN** se crea el usuario con nombre, email y contraseña hasheada mediante el mixin de autenticación y el hasher scrypt; se emite un token; el frontend guarda el token en `localStorage` bajo `flowsync.token`, almacena el usuario en memoria, cambia a `authenticated`, limpia el error de sesión y redirige a `/profile`.

### Requirement AUTH-05 — Validación y verificación del login

La API **SHALL** validar el email con formato de email y máximo 254 caracteres y la contraseña como cadena requerida; posteriormente **SHALL** verificar las credenciales del usuario. El validador de login no impone la longitud de contraseña del registro. Evidencia: E02, E04, E16.

#### Scenario — Credenciales correctas

- **WHEN** se envía `POST /api/v1/auth/login` con email y contraseña válidos de un usuario existente.
- **THEN** se crea un token de acceso y se devuelve `{ data: { user, token } }`.

#### Scenario — Credenciales incorrectas

- **WHEN** el payload pasa la validación, pero el email no corresponde a un usuario o la contraseña es incorrecta.
- **THEN** la verificación devuelve 400 por credenciales inválidas y no se crea un token.

#### Scenario — Payload inválido

- **WHEN** el email no tiene formato válido o supera 254 caracteres, o falta un campo requerido o no es una cadena aceptada por el validador.
- **THEN** la validación devuelve 422 antes de verificar las credenciales.

### Requirement AUTH-06 — Inicio de sesión en el frontend

El formulario de `/login` **SHALL** enviar email y contraseña al endpoint de login e iniciar la sesión al recibir una respuesta satisfactoria. Evidencia: E08, E09, E11, E13.

#### Scenario — Login completado

- **WHEN** un usuario envía el formulario y la API devuelve usuario y token.
- **THEN** el frontend guarda `flowsync.token`, establece usuario y token en memoria, pasa a `authenticated`, elimina `sessionError` y redirige a `/profile`.

#### Scenario — Credenciales rechazadas

- **WHEN** el login responde 400.
- **THEN** el formulario muestra «El email o la contraseña no son correctos.» y el intento no inicia una sesión.

### Requirement AUTH-07 — Estado inicial y restauración de sesión

El frontend **SHALL** empezar en `anonymous` si no hay token guardado, o en `loading` si lo hay, y validar ese token mediante `GET /api/v1/account/profile` antes de establecer una sesión autenticada. Evidencia: E08, E09, E13.

#### Scenario — Arranque sin token

- **WHEN** se carga la aplicación sin `flowsync.token` en `localStorage`.
- **THEN** el estado inicial es `anonymous`, no se solicita el perfil para restaurar la sesión y el acceso a `/profile` redirige a `/login`.

#### Scenario — Token guardado pendiente de validación

- **WHEN** se carga la aplicación con un token guardado y la consulta del perfil está pendiente.
- **THEN** el estado es `loading` y los guards de `/login`, `/register` y `/profile` muestran un indicador con texto accesible «Cargando…» en lugar de sus pantallas o redirecciones de autenticación.

#### Scenario — Restauración correcta

- **WHEN** la consulta del perfil con el token guardado tiene éxito.
- **THEN** el frontend conserva ese token, guarda el perfil recibido en memoria y cambia a `authenticated`.

### Requirement AUTH-08 — Fallos al restaurar la sesión

El frontend **SHALL** distinguir un rechazo 401 de otros errores durante la restauración y conservar un mensaje explicativo para el login. Evidencia: E08, E09, E11.

#### Scenario — Token rechazado

- **WHEN** la restauración del perfil responde 401.
- **THEN** se elimina `flowsync.token` de `localStorage`, se limpian usuario y token en memoria, se pasa a `anonymous` y el login muestra «Tu sesión ha caducado. Vuelve a iniciar sesión.».

#### Scenario — Error de red o de servidor

- **WHEN** falla la restauración por red o por un error distinto de 401.
- **THEN** se limpian usuario y token en memoria y se pasa a `anonymous`, pero se conserva el token en `localStorage`; el login muestra el mensaje del error y una recarga vuelve a intentar restaurarlo.

#### Scenario — Prioridad del error de login

- **WHEN** hay un error de restauración guardado y un intento de login genera un error general de formulario.
- **THEN** el aviso muestra el error del intento actual (`formError ?? sessionError`). Si el intento solo produce errores inline, el aviso de restauración puede seguir visible.

### Requirement AUTH-09 — Navegación según la sesión

Las rutas del frontend **SHALL** restringir `/profile` a usuarios autenticados, reservar `/login` y `/register` a usuarios anónimos y dirigir las rutas no reconocidas a `/profile`, utilizando redirecciones con `replace`. Evidencia: E13.

#### Scenario — Acceso anónimo al perfil

- **WHEN** el estado es `anonymous` y se accede a `/profile`.
- **THEN** se redirige a `/login`.

#### Scenario — Acceso autenticado a pantallas públicas

- **WHEN** el estado es `authenticated` y se accede a `/login` o `/register`.
- **THEN** se redirige a `/profile`.

#### Scenario — Ruta raíz o desconocida

- **WHEN** se accede a `/` o a una ruta no declarada.
- **THEN** se redirige a `/profile`, donde se aplica el guard de autenticación; un usuario anónimo termina en `/login`.

### Requirement AUTH-10 — Transporte y representación del usuario

El cliente **SHALL** enviar JSON para los payloads de registro/login y adjuntar `Authorization: Bearer <token>` en perfil/logout. La API **SHALL** exponer el usuario mediante el transformer con `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials`, sin contraseña. Evidencia: E03–E05, E08.

#### Scenario — Consulta del usuario autenticado

- **WHEN** se consulta `GET /api/v1/account/profile` con un token válido.
- **THEN** se devuelve `{ data: <usuario> }` del usuario asociado al token, con los campos seleccionados por el transformer.

#### Scenario — Cliente consume una respuesta autenticada

- **WHEN** registro, login o perfil devuelven su respuesta satisfactoria.
- **THEN** el cliente extrae `response.data`; no guarda la envoltura como parte del usuario o del resultado de autenticación.

### Requirement AUTH-11 — Presentación del perfil

La pantalla `/profile` **SHALL** presentar los datos del usuario mantenidos en el contexto: iniciales, nombre (o «Sin nombre» si es null), email, fecha de alta bajo «Miembro desde» y un botón «Cerrar sesión». Evidencia: E06, E09, E14.

#### Scenario — Perfil con nombre

- **WHEN** el usuario en el contexto tiene `fullName: "Ada Lovelace"`.
- **THEN** la pantalla muestra ese nombre, su email y las iniciales `AL`; la fecha de alta se formatea con `Intl.DateTimeFormat('es-ES', { dateStyle: 'long' })` en la zona horaria del navegador.

#### Scenario — Perfil sin nombre

- **WHEN** el usuario tiene `fullName: null` y email `ada@example.com`.
- **THEN** aparece «Sin nombre» y las iniciales son `AE`, derivadas de la primera letra de las dos partes del email separadas por `@`.

#### Scenario — Nombre de una palabra

- **WHEN** el usuario tiene `fullName: "Ada"`.
- **THEN** las iniciales son `AD`, los dos primeros caracteres del nombre en mayúsculas. Con nombre de varias palabras se utilizan las primeras letras de las dos primeras partes separadas por un espacio.

#### Scenario — Datos ya cargados

- **WHEN** se monta la pantalla de perfil con el usuario disponible en el contexto.
- **THEN** se renderizan esos datos sin realizar desde la pantalla una nueva petición de perfil.

### Requirement AUTH-12 — Cierre local de sesión

El frontend **SHALL** borrar inmediatamente la sesión local al solicitar logout, antes de esperar al backend, y **SHALL** ignorar los errores de la petición de cierre. Evidencia: E08, E09, E13, E14.

#### Scenario — Cierre con token en memoria

- **WHEN** el usuario pulsa «Cerrar sesión» con un token activo en memoria.
- **THEN** se elimina `flowsync.token`, se limpian usuario y token, se pasa a `anonymous`, se elimina el error de sesión y el guard redirige a `/login`; además se envía `POST /api/v1/account/logout` con el token que había antes de limpiar el estado.

#### Scenario — Backend no disponible al cerrar

- **WHEN** falla la petición de logout, por ejemplo por red o por respuesta 401.
- **THEN** la sesión local sigue cerrada y no se muestra un error de logout. Un fallo de red no demuestra que se haya revocado el token en el servidor.

#### Scenario — Cierre sin token en memoria

- **WHEN** se invoca `logout` sin token en memoria.
- **THEN** se limpia la sesión local, incluido cualquier token guardado, sin enviar una petición de logout.

### Requirement AUTH-13 — Revocación en el backend

La API **SHALL** eliminar únicamente el token actual del usuario autenticado al procesar logout y responder `{ message: "Logged out successfully" }`, sin envoltura `data`. Evidencia: E01, E04, E16.

#### Scenario — Revocación del token utilizado

- **WHEN** un cliente autenticado envía `POST /api/v1/account/logout`.
- **THEN** se elimina el registro del token identificado por `user.currentAccessToken.identifier`; una consulta posterior del perfil con ese token responde 401.

#### Scenario — Dos tokens del mismo usuario

- **WHEN** un usuario dispone de tokens A y B emitidos en inicios de sesión distintos y cierra sesión usando A.
- **THEN** se elimina A; la operación no elimina B, que puede seguir autenticando si continúa siendo válido.

### Requirement AUTH-14 — Errores y estado de los formularios

Los formularios **SHALL** desactivar su botón de envío mientras esperan la acción, limpiar los errores al comenzar cada envío mediante `submit`, mostrar los errores de campos visibles junto al input y utilizar un aviso general cuando corresponda. Evidencia: E08, E10–E12.

#### Scenario — Envío en curso

- **WHEN** el formulario está esperando la respuesta de registro o login.
- **THEN** su botón queda desactivado y muestra «Creando cuenta…» o «Entrando…», respectivamente; al terminar con error vuelve a habilitarse. Los formularios usan `noValidate`: los atributos HTML no sustituyen la validación del backend.

#### Scenario — Errores 422 de campos visibles

- **WHEN** la API responde 422 con errores y todos los campos de error son inputs presentes en el formulario.
- **THEN** se conserva el primer mensaje por campo, se muestra traducido inline, se marca el input con `aria-invalid` y se enlaza mediante `aria-describedby`; el hook no crea un aviso general para esos errores.

#### Scenario — Error sin campo visible

- **WHEN** hay un error de API sin errores por campo o algún campo de error no está representado en el formulario.
- **THEN** el hook muestra también un aviso general con el mensaje de `ApiError`.

#### Scenario — Traducciones de validación

- **WHEN** se recibe un error `database.unique` para email o `sameAs`.
- **THEN** los mensajes son «Ese email ya está registrado. Inicia sesión en su lugar.» y «Las contraseñas no coinciden.», respectivamente. Las reglas `email`, `required`, `minLength` y `maxLength` también tienen traducción; las reglas no reconocidas usan «Revisa el campo.» o su etiqueta conocida.

#### Scenario — Fallo de conexión

- **WHEN** `fetch` falla por conexión.
- **THEN** el cliente produce un `ApiError` con estado interno 0 y mensaje «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.».

#### Scenario — Otros fallos generales

- **WHEN** la API responde con un error distinto de los casos específicos 400, 401 o 422 con errores.
- **THEN** el mensaje es «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.»; un error ajeno a `ApiError` durante el envío se muestra como «Algo ha ido mal. Inténtalo de nuevo.».

## Límites observados para mantener viva la especificación

- Los controladores crean tokens sin opciones de expiración, y el modelo configura el proveedor sin `expiresIn`. La dependencia instalada genera `expires_at: null` en ese caso (E03, E04, E06, E16). El mensaje de frontend «sesión ha caducado» es una traducción de cualquier 401, no evidencia de un vencimiento temporal configurado.
- La recuperación del token ocurre al montar `AuthProvider`; no hay polling, renovación de tokens ni listener de sincronización de `localStorage` entre pestañas en este proveedor (E09). No hay un mecanismo global que cambie la sesión por cualquier futuro 401: el tratamiento que borra el token está en la restauración del perfil.
- El perfil es de lectura. Las rutas y la pantalla estudiadas no implementan edición del perfil, recuperación de contraseña ni verificación de email (E01, E13, E14).
- El recorte del nombre es una transformación del formulario, no una regla del validador de API. No se ha encontrado normalización explícita del email mediante trim o conversión a minúsculas; no se especifica equivalencia entre emails de distinta capitalización (E02, E10, E11).
- Registro crea usuario y después token, sin una transacción explícita en el controlador; esta especificación no garantiza rollback del usuario si falla la emisión del token (E03).
- Las futuras modificaciones de este flujo deben actualizar los requisitos y escenarios afectados junto con su evidencia. La cobertura automatizada futura debe distinguir escenarios de interfaz, API y persistencia; este documento no afirma que ya exista.
