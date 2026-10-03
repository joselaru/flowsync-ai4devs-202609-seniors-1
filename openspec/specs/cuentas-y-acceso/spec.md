# Cuentas y acceso

## Purpose

Permitir crear una cuenta, iniciar y mantener una sesión, consultar el perfil propio y cerrar la sesión. Esta living spec documenta la baseline actual de la API y la interfaz; los detalles cuya intención contractual no está clara se recogen en `revision.md`.

## Requirements

### Requirement: Registro con credenciales válidas

El sistema SHALL permitir crear una cuenta con un email válido no registrado, una contraseña de entre 8 y 32 caracteres y una confirmación coincidente. La interfaz SHALL permitir dejar el nombre completo sin rellenar.

#### Scenario: Alta desde la API

- **WHEN** se envía `POST /api/v1/auth/signup` con `fullName` como texto o `null`, un email válido de hasta 254 caracteres no registrado y las contraseñas válidas y coincidentes en `password` y `passwordConfirmation`
- **THEN** se crea la cuenta y la respuesta JSON contiene `{ data: { user, token } }`, con los datos públicos del usuario y un token utilizable para autenticarse.

#### Scenario: Alta desde la interfaz

- **WHEN** una persona sin sesión completa correctamente el formulario de `/register`, con o sin nombre, y el alta tiene éxito
- **THEN** queda con sesión iniciada y accede a `/profile` sin tener que iniciar sesión por separado.

### Requirement: Rechazo de registros inválidos

El sistema SHALL rechazar registros que no cumplan la validación de email, unicidad, longitud de contraseña o confirmación, y la interfaz SHALL mostrar errores comprensibles asociados a los campos afectados.

#### Scenario: Email ya registrado

- **WHEN** se solicita un registro con un email ya registrado
- **THEN** se rechaza el alta por validación y el formulario informa de que ese email ya está registrado.

#### Scenario: Contraseña fuera de los límites

- **WHEN** se solicita un registro con una contraseña de menos de 8 o más de 32 caracteres
- **THEN** se rechaza el alta por validación y el formulario informa del límite incumplido.

#### Scenario: Confirmación diferente en la interfaz

- **WHEN** se envía el formulario de registro con contraseñas que no coinciden
- **THEN** se muestra un error en la confirmación y no se envía la solicitud de alta.

#### Scenario: Confirmación diferente en la API

- **WHEN** se envía directamente una solicitud de alta con una confirmación diferente de la contraseña
- **THEN** la API rechaza la solicitud por validación.

### Requirement: Inicio de sesión con credenciales

El sistema SHALL permitir iniciar sesión con el email y la contraseña de una cuenta existente y SHALL rechazar las credenciales incorrectas sin iniciar una sesión nueva.

#### Scenario: Credenciales correctas en la API

- **WHEN** se envía `POST /api/v1/auth/login` con `email` y `password` correctos
- **THEN** la respuesta JSON contiene `{ data: { user, token } }`, con los datos públicos del usuario y un token utilizable para autenticarse.

#### Scenario: Credenciales correctas en la interfaz

- **WHEN** una persona sin sesión envía credenciales correctas desde `/login` y la petición tiene éxito
- **THEN** queda con sesión iniciada y accede a `/profile`.

#### Scenario: Credenciales incorrectas

- **WHEN** una persona envía desde el formulario de login un email con formato válido y una contraseña no vacía que no corresponden a una cuenta
- **THEN** permanece sin sesión iniciada y recibe un aviso comprensible de que el email o la contraseña son incorrectos.

### Requirement: Comunicación de errores en los formularios

La interfaz SHALL mostrar los errores de validación junto a los campos correspondientes y los fallos generales mediante un aviso en el formulario. SHALL permitir volver a intentar el envío después de un fallo.

#### Scenario: Error de validación de un campo visible

- **WHEN** la API devuelve errores de validación correspondientes a campos presentes en el formulario de acceso
- **THEN** se muestran mensajes en castellano junto a esos campos y el botón de envío vuelve a estar disponible.

#### Scenario: Fallo de conexión al enviar

- **WHEN** falla la conexión con el servidor durante un intento de registro o login
- **THEN** el formulario muestra un aviso de conexión y permite volver a intentarlo.

### Requirement: Persistencia y restauración de sesión

La interfaz SHALL conservar la credencial de una sesión iniciada para restaurarla al volver a cargar la aplicación. SHALL comprobarla consultando el perfil antes de dar acceso a las vistas protegidas.

#### Scenario: Arranque sin credencial guardada

- **WHEN** se abre la aplicación sin una credencial de sesión guardada
- **THEN** se considera a la persona anónima y no se muestra el perfil protegido.

#### Scenario: Restauración correcta

- **WHEN** se recarga la aplicación o se vuelve a abrir con una credencial guardada y la consulta del perfil tiene éxito
- **THEN** se restaura la sesión con el usuario obtenido y se permite acceder al perfil.

#### Scenario: Restauración pendiente

- **WHEN** está pendiente la comprobación de una credencial guardada al abrir `/login`, `/register` o `/profile`
- **THEN** se muestra un indicador de carga en lugar del formulario o del perfil, sin decidir todavía la redirección según el estado de sesión.

#### Scenario: Credencial rechazada

- **WHEN** la consulta de perfil durante la restauración responde con `401`
- **THEN** se elimina la credencial guardada, la sesión pasa a anónima y el login muestra un aviso para volver a iniciar sesión.

#### Scenario: Restauración interrumpida por un fallo transitorio

- **WHEN** la consulta de perfil durante la restauración falla por conexión o por un error de servidor distinto de `401`
- **THEN** no se da acceso al perfil, se muestra el motivo en el login y se conserva la credencial guardada para que una recarga pueda volver a comprobarla.

### Requirement: Acceso a las pantallas según la sesión

La interfaz SHALL reservar `/profile` a las sesiones autenticadas y SHALL dirigir a las personas ya autenticadas desde las pantallas de login o registro hacia su perfil.

#### Scenario: Visita anónima al perfil

- **WHEN** una persona con el estado de sesión resuelto como anónimo visita `/profile`
- **THEN** se redirige a `/login` y no se muestra el perfil.

#### Scenario: Visita autenticada a una pantalla de acceso

- **WHEN** una persona con sesión autenticada visita `/login` o `/register`
- **THEN** se redirige a `/profile`.

### Requirement: Consulta del perfil propio

La API SHALL permitir consultar exclusivamente el perfil del usuario autenticado en `GET /api/v1/account/profile` mediante una credencial `Authorization: Bearer <token>` válida. SHALL rechazar el acceso sin autenticación válida.

#### Scenario: Consulta autenticada

- **WHEN** se solicita el perfil con un token válido
- **THEN** la respuesta JSON contiene `{ data: user }` con `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials` del usuario autenticado, sin contraseña ni token de acceso en ese objeto.

#### Scenario: Consulta sin autenticación válida

- **WHEN** se solicita el perfil sin un token válido
- **THEN** la API responde con `401` y no entrega el perfil.

### Requirement: Visualización del perfil

La interfaz SHALL mostrar el nombre, el email, las iniciales y la fecha de alta del usuario de la sesión, junto con una acción para cerrar sesión.

#### Scenario: Perfil de una cuenta con nombre

- **WHEN** una persona autenticada accede al perfil de una cuenta con nombre
- **THEN** ve su nombre, email, iniciales y fecha de alta, y puede iniciar el cierre de sesión.

#### Scenario: Perfil de una cuenta sin nombre

- **WHEN** una persona autenticada accede al perfil de una cuenta cuyo nombre es `null`
- **THEN** ve una indicación de ausencia de nombre junto a su email, iniciales y fecha de alta.

### Requirement: Cierre de sesión local

La interfaz SHALL cerrar la sesión local cuando la persona elige cerrar sesión, eliminar la credencial persistida e intentar comunicar el cierre al servidor. El cierre local SHALL completarse aunque falle esa petición.

#### Scenario: Cierre desde el perfil

- **WHEN** una persona autenticada pulsa la acción de cerrar sesión
- **THEN** deja de tener acceso al perfil, se elimina su credencial guardada y se redirige al login.

#### Scenario: Fallo de la petición de cierre

- **WHEN** falla la petición al servidor después de elegir cerrar sesión en la interfaz
- **THEN** la sesión local permanece cerrada y el perfil sigue sin estar accesible desde esa sesión de la interfaz.

#### Scenario: Navegación tras cerrar sesión

- **WHEN** después del cierre local se intenta volver al perfil mediante la navegación del navegador
- **THEN** la protección de rutas dirige al login en lugar de mostrar el perfil.

### Requirement: Cierre autenticado en la API

La API SHALL aceptar `POST /api/v1/account/logout` con un token válido y revocar el token utilizado en esa petición. SHALL exigir autenticación válida para esta operación.

#### Scenario: Revocación del token presentado

- **WHEN** se solicita el cierre de sesión con un token válido y la operación tiene éxito
- **THEN** ese token deja de permitir consultar el perfil.

#### Scenario: Cierre sin autenticación válida

- **WHEN** se solicita el cierre de sesión sin un token válido
- **THEN** la API responde con `401`.
