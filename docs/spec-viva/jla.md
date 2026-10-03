# Spec viva: registro, inicio de sesión, sesión, perfil y cierre de sesión

## Purpose

Permitir crear una cuenta, iniciar sesión, recuperar el acceso al recargar la aplicación, consultar el perfil y cerrar sesión. Esta especificación describe el comportamiento observable de FlowSync que se deriva de su implementación actual.

## Requirements

### Requirement: AUTH-01 — Acceso a los endpoints

La API **SHALL** permitir registro e inicio de sesión sin autenticación y exigir un token de acceso válido para consultar el perfil o cerrar sesión.

#### Scenario: Operaciones públicas

- **WHEN** un cliente sin token envía `POST /api/v1/auth/signup` o `POST /api/v1/auth/login`.
- **THEN** se valida el payload de la operación solicitada, sin exigir una sesión previa.

#### Scenario: Operación protegida sin autenticación válida

- **WHEN** un cliente consulta `GET /api/v1/account/profile` o envía `POST /api/v1/account/logout` sin token, con un token inválido o con uno revocado.
- **THEN** la API responde 401 en JSON y no devuelve el perfil ni confirma el cierre de sesión solicitado.

### Requirement: AUTH-02 — Validación del registro

La API **SHALL** exigir la clave `fullName` y aceptar una cadena o `null` en ella, exigir un `email` con formato de email y máximo 254 caracteres que no esté registrado, y exigir `password` y `passwordConfirmation` como cadenas de 8 a 32 caracteres coincidentes.

#### Scenario: Registro sin nombre

- **WHEN** se envían `fullName: null`, un email válido no registrado y contraseñas coincidentes de 8 a 32 caracteres.
- **THEN** los campos satisfacen las reglas de registro; la ausencia de un nombre no impide crear la cuenta.

#### Scenario: Clave de nombre omitida

- **WHEN** el payload de registro omite `fullName` y el resto de los campos es válido.
- **THEN** la validación devuelve 422 con un error `required` para `fullName`; nullable no equivale a permitir omitir la clave.

#### Scenario: Email ya registrado

- **WHEN** se envía un email que ya está registrado y los demás campos son válidos.
- **THEN** la validación devuelve 422 con un error `database.unique` para `email`, antes de crear el usuario o su token.

#### Scenario: Campos inválidos

- **WHEN** falta un campo no nullable, el email no cumple su formato o supera 254 caracteres, una contraseña queda fuera de 8–32 caracteres o la confirmación no coincide.
- **THEN** la validación devuelve 422 con errores por campo y no se ejecuta la creación de la cuenta.

### Requirement: AUTH-03 — Envío del formulario de registro

El formulario de `/register` **SHALL** ofrecer nombre opcional, email, contraseña y confirmación; recortar el nombre y enviar `null` si queda vacío; y comprobar localmente la coincidencia de contraseñas antes de llamar a la API.

#### Scenario: Nombre vacío o compuesto solo por espacios

- **WHEN** se envía el formulario con contraseñas iguales y el nombre vacío o formado solo por espacios.
- **THEN** se envía `fullName: null`; el email y las contraseñas se envían tal como están en el estado del formulario.

#### Scenario: Nombre con espacios en los extremos

- **WHEN** se envía el formulario con nombre `" Ada Lovelace "` y contraseñas iguales.
- **THEN** la petición contiene `fullName: "Ada Lovelace"`.

#### Scenario: Contraseñas diferentes en la interfaz

- **WHEN** se intenta enviar el formulario con contraseñas distintas.
- **THEN** aparece «Las contraseñas no coinciden.» junto a la confirmación y no se llama a la API de registro.

### Requirement: AUTH-04 — Cuenta y sesión tras el registro

Ante un registro válido, la API **SHALL** crear la cuenta y un token de acceso, devolver `{ data: { user, token } }`, y la aplicación **SHALL** iniciar la sesión con esa respuesta.

#### Scenario: Alta completada

- **WHEN** se completa el registro válido desde `/register`.
- **THEN** la API devuelve los datos del usuario y un token; la aplicación muestra `/profile` sin pedir otro inicio de sesión y deja de mostrar cualquier error anterior de sesión; la cuenta permite iniciar sesión posteriormente con las credenciales registradas.

### Requirement: AUTH-05 — Validación y verificación del login

La API **SHALL** exigir un email con formato válido y máximo 254 caracteres y una contraseña como cadena requerida; posteriormente **SHALL** verificar las credenciales del usuario. El login no impone la longitud de contraseña del registro como regla de validación.

#### Scenario: Credenciales correctas

- **WHEN** se envía `POST /api/v1/auth/login` con email y contraseña válidos de un usuario existente.
- **THEN** se crea un token de acceso y se devuelve `{ data: { user, token } }`.

#### Scenario: Credenciales incorrectas

- **WHEN** el payload pasa la validación, pero el email no corresponde a un usuario o la contraseña es incorrecta.
- **THEN** la verificación devuelve 400 por credenciales inválidas y no se crea un token.

#### Scenario: Payload inválido

- **WHEN** el email no tiene formato válido o supera 254 caracteres, o falta un campo requerido o no es una cadena aceptada por el validador.
- **THEN** la validación devuelve 422 antes de verificar las credenciales.

### Requirement: AUTH-06 — Inicio de sesión en el frontend

El formulario de `/login` **SHALL** enviar email y contraseña al endpoint de login e iniciar la sesión al recibir una respuesta satisfactoria.

#### Scenario: Login completado

- **WHEN** un usuario envía el formulario y la API devuelve usuario y token.
- **THEN** la aplicación muestra `/profile` con los datos del usuario y deja de mostrar el error de sesión anterior; una recarga permite recuperar el acceso con el token recibido mientras siga siendo válido.

#### Scenario: Credenciales rechazadas

- **WHEN** el login responde 400.
- **THEN** el formulario muestra «El email o la contraseña no son correctos.» y el intento no inicia una sesión.

### Requirement: AUTH-07 — Estado inicial y restauración de sesión

La aplicación **SHALL** mostrar las pantallas públicas si no hay una sesión guardada y consultar `GET /api/v1/account/profile` con el token guardado para restaurar el acceso al recargar.

#### Scenario: Arranque sin token

- **WHEN** se carga la aplicación sin un token guardado de una sesión anterior.
- **THEN** no se solicita el perfil para restaurar la sesión y el acceso a `/profile` redirige a `/login`.

#### Scenario: Token guardado pendiente de validación

- **WHEN** se carga la aplicación con un token guardado y la consulta del perfil está pendiente.
- **THEN** `/login`, `/register` y `/profile` muestran un indicador con texto accesible «Cargando…» en lugar de sus pantallas o redirecciones de autenticación.

#### Scenario: Restauración correcta

- **WHEN** la consulta del perfil con el token guardado tiene éxito.
- **THEN** se permite acceder a `/profile` con el usuario recibido, sin introducir de nuevo las credenciales.

### Requirement: AUTH-08 — Fallos al restaurar la sesión

La aplicación **SHALL** distinguir un rechazo 401 de otros errores durante la restauración y mostrar un mensaje explicativo en el login.

#### Scenario: Token rechazado

- **WHEN** la restauración del perfil responde 401.
- **THEN** se redirige a `/login` cuando se estaba accediendo a `/profile` y el login muestra «Tu sesión ha caducado. Vuelve a iniciar sesión.»; al volver a recargar no se reintenta restaurar con ese token rechazado.

#### Scenario: Error de red o de servidor

- **WHEN** falla la restauración por red o por un error distinto de 401.
- **THEN** no se permite acceder al perfil, el login muestra el mensaje del error y una recarga vuelve a intentar restaurar la sesión con el mismo token.

#### Scenario: Prioridad del error de login

- **WHEN** hay un error de restauración guardado y un intento de login genera un error general de formulario.
- **THEN** el aviso muestra el error del intento actual. Si el intento solo produce errores junto a los campos, el aviso de restauración puede seguir visible.

### Requirement: AUTH-09 — Navegación según la sesión

La aplicación **SHALL** restringir `/profile` a usuarios autenticados, reservar `/login` y `/register` a usuarios sin sesión activa y dirigir las rutas no reconocidas a `/profile`, reemplazando la entrada actual del historial en esas redirecciones.

#### Scenario: Acceso anónimo al perfil

- **WHEN** no hay una sesión activa ni una restauración pendiente y se accede a `/profile`.
- **THEN** se redirige a `/login`.

#### Scenario: Acceso autenticado a pantallas públicas

- **WHEN** hay una sesión activa y se accede a `/login` o `/register`.
- **THEN** se redirige a `/profile`.

#### Scenario: Ruta raíz o desconocida

- **WHEN** se accede a `/` o a una ruta no declarada.
- **THEN** se redirige a `/profile`; un usuario sin sesión activa termina en `/login` una vez resuelta cualquier restauración pendiente.

### Requirement: AUTH-10 — Transporte y representación del usuario

El cliente **SHALL** enviar JSON para los payloads de registro/login y adjuntar `Authorization: Bearer <token>` en perfil/logout. La API **SHALL** exponer el usuario con `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials`, sin contraseña.

#### Scenario: Consulta del usuario autenticado

- **WHEN** se consulta `GET /api/v1/account/profile` con un token válido.
- **THEN** se devuelve `{ data: <usuario> }` del usuario asociado al token, con los campos indicados y sin contraseña.

#### Scenario: Cliente consume una respuesta autenticada

- **WHEN** registro, login o perfil devuelven su respuesta satisfactoria.
- **THEN** la aplicación presenta el perfil correspondiente al usuario incluido en `data`, sin mostrar la envoltura JSON como datos del perfil.

### Requirement: AUTH-11 — Presentación del perfil

La pantalla `/profile` **SHALL** presentar iniciales, nombre (o «Sin nombre» si es null), email, fecha de alta bajo «Miembro desde» y un botón «Cerrar sesión».

#### Scenario: Perfil con nombre

- **WHEN** el usuario tiene `fullName: "Ada Lovelace"`.
- **THEN** la pantalla muestra ese nombre, su email y las iniciales `AL`; la fecha de alta se presenta en formato largo de español de España, en la zona horaria del navegador.

#### Scenario: Perfil sin nombre

- **WHEN** el usuario tiene `fullName: null` y email `ada@example.com`.
- **THEN** aparece «Sin nombre» y las iniciales son `AE`, derivadas de la primera letra de las dos partes del email separadas por `@`.

#### Scenario: Nombre de una palabra

- **WHEN** el usuario tiene `fullName: "Ada"`.
- **THEN** las iniciales son `AD`, los dos primeros caracteres del nombre en mayúsculas.

#### Scenario: Nombre con espacios interiores consecutivos

- **WHEN** se registra y se muestra el perfil con nombre `"Ada  Lovelace"`, con dos espacios entre las palabras.
- **THEN** se muestran las iniciales `AD`, en lugar de `AL`.

#### Scenario: Datos ya cargados

- **WHEN** se accede a la pantalla de perfil después de completar registro, login o restauración de sesión.
- **THEN** se muestran los datos ya recibidos sin realizar desde la pantalla una nueva petición de perfil.

### Requirement: AUTH-12 — Cierre local de sesión

La aplicación **SHALL** cerrar inmediatamente el acceso local al solicitar logout, antes de esperar a la API, y **SHALL** mantenerlo cerrado aunque falle la petición.

#### Scenario: Cierre con sesión activa

- **WHEN** el usuario pulsa «Cerrar sesión» con una sesión activa.
- **THEN** se redirige a `/login`, se elimina el aviso anterior de sesión y se envía `POST /api/v1/account/logout` con el token utilizado; una recarga no restaura la sesión que se acaba de cerrar.

#### Scenario: Backend no disponible al cerrar

- **WHEN** falla la petición de logout, por ejemplo por red o por respuesta 401.
- **THEN** la sesión local sigue cerrada y no se muestra un error de logout. Un fallo de red no demuestra que se haya revocado el token en el servidor.

### Requirement: AUTH-13 — Revocación en el backend

La API **SHALL** revocar únicamente el token utilizado para autenticar la petición de logout y responder `{ message: "Logged out successfully" }`, sin envoltura `data`.

#### Scenario: Revocación del token utilizado

- **WHEN** un cliente autenticado envía `POST /api/v1/account/logout`.
- **THEN** una consulta posterior del perfil con ese mismo token responde 401.

#### Scenario: Dos tokens del mismo usuario

- **WHEN** un usuario dispone de tokens A y B emitidos en inicios de sesión distintos y cierra sesión usando A.
- **THEN** se elimina A; la operación no elimina B, que puede seguir autenticando si continúa siendo válido.

### Requirement: AUTH-14 — Errores y estado de los formularios

Los formularios **SHALL** desactivar su botón de envío mientras esperan la acción, limpiar los errores del intento anterior al comenzar una nueva petición, mostrar los errores de campos visibles junto al input y utilizar un aviso general cuando corresponda.

#### Scenario: Envío en curso

- **WHEN** el formulario está esperando la respuesta de registro o login.
- **THEN** su botón queda desactivado y muestra «Creando cuenta…» o «Entrando…», respectivamente; al terminar con error vuelve a habilitarse. El navegador no impide el envío por su validación nativa de campos: la API determina los errores, salvo la comprobación local de coincidencia de contraseñas en registro.

#### Scenario: Errores 422 de campos visibles

- **WHEN** la API responde 422 con errores y todos los campos de error son inputs presentes en el formulario.
- **THEN** se muestra el primer mensaje traducido por campo junto al input y este queda identificado como inválido y asociado a su mensaje para tecnologías de asistencia; no aparece un aviso general nuevo para esos errores.

#### Scenario: Error sin campo visible

- **WHEN** hay un error de API sin errores por campo o algún campo de error no está representado en el formulario.
- **THEN** aparece también un aviso general con el mensaje traducido del error.

#### Scenario: Traducciones de validación

- **WHEN** se recibe un error `database.unique` para email o `sameAs`.
- **THEN** los mensajes son «Ese email ya está registrado. Inicia sesión en su lugar.» y «Las contraseñas no coinciden.», respectivamente. Las reglas `email`, `required`, `minLength` y `maxLength` también tienen traducción; las reglas no reconocidas usan «Revisa el campo.» o su etiqueta conocida.

#### Scenario: Fallo de conexión

- **WHEN** una petición del formulario falla por conexión.
- **THEN** aparece «No se pudo conectar con el servidor. Comprueba que el backend está arrancado.».

#### Scenario: Otros fallos generales

- **WHEN** la API responde con un error distinto de los casos específicos 400, 401 o 422 con errores.
- **THEN** el mensaje es «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.».

## Comprobación y observaciones

Base analizada: commit `a58a01880b0bc14b55d0468cc09b82564599a81c`. Los requisitos con **SHALL** describen el comportamiento actual, no propuestas de producto.

### 1. Requisitos escritos y comprobados

- Requisitos escritos por el agente: **14**.
- Requisitos comprobados personalmente por el usuario: **dato no proporcionado**; pendiente de completar por el usuario, sin atribuirle comprobaciones del agente.
- Comprobación del agente: lectura de las dos capas y sus dependencias para los 14 requisitos. Prueba aislada de validación: omitir `fullName` produce `required` y estado 422; `null`, cadena vacía y cadena con espacios se aceptan. Los demás escenarios proceden de lectura del código; no se han ejecutado pruebas HTTP ni end-to-end. No se encontró cobertura automatizada de autenticación existente.

### 2. Incoherencias observadas

- **Registro, formulario frente a API:** el nombre se anuncia como opcional, pero omitir la clave `fullName` en la API da error; el formulario evita esa diferencia enviando `null` cuando está vacío.
- **Restauración, aviso de login:** cualquier 401 se anuncia como «sesión ha caducado», aunque no se configura una duración de los tokens emitidos; el mismo mensaje aparece con un token revocado o inválido.
- **Perfil, iniciales:** `Ada Lovelace` produce `AL`, pero `Ada  Lovelace` produce `AD`; el registro conserva los espacios interiores consecutivos.
- **Respuestas de API:** registro, login y perfil usan la envoltura `data`; logout responde con `message` en la raíz.
- **Login tras restauración fallida:** un error general del intento actual reemplaza el aviso de sesión, pero los errores junto a campos pueden coexistir con el aviso anterior.

### 3. Incertidumbres: bug o contrato

- **Logout sin conexión:** no se puede decidir por lectura si cerrar el acceso local pese a no poder revocar el token es el contrato deseado para funcionar sin red, o un bug porque «cerrar sesión» debería garantizar que el token deje de funcionar también en otro cliente.
- **Fallo temporal al restaurar:** conservar el token para reintentar en una recarga puede ser tolerancia deliberada a fallos de red, o puede contradecir que el usuario haya sido enviado al login como si su sesión hubiera terminado.
- **Iniciales con espacios consecutivos:** el resultado `AD` puede ser un fallback aceptado, o un defecto frente a la expectativa de ver `AL` para el mismo nombre; el código confirma el resultado, no la intención de producto.

### Límites de lo especificado

- La restauración ocurre al cargar la aplicación. No se ha encontrado renovación periódica de tokens ni sincronización automática del cierre entre pestañas; no se promete ese comportamiento.
- El perfil ofrece lectura y cierre de sesión; no ofrece edición, recuperación de contraseña ni verificación de email.
- No se promete que emails con capitalización distinta sean equivalentes, ni que un fallo durante la emisión del token deshaga una cuenta ya creada.
- No se ha comprobado la vigencia de un token esperando el paso del tiempo. La ausencia de expiración configurada no se convierte aquí en una promesa de duración ilimitada.
