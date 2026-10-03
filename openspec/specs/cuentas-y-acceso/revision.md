# Revisión de la baseline de cuentas y acceso

## Estado y alcance de la evidencia

- Fecha de exploración: 2026-10-03.
- Baseline brownfield de registro, login, sesión, perfil y logout, incluyendo API e interfaz. No es una propuesta de cambio.
- La spec contiene 10 requisitos y 27 escenarios, contrastados estáticamente con el código. Esta comprobación del agente no representa aprobación contractual ni revisión humana.
- No se ejecutaron los flujos en un navegador ni peticiones de prueba, ni se verificó la persistencia mediante cierres reales de pestaña. Los escenarios describen resultados inferidos de las rutas, validadores, controladores y estado de la interfaz; no se presentan como pruebas ejecutadas.
- No se encontraron tests de comportamiento del vertical: el backend tiene infraestructura de pruebas, pero no casos unitarios o funcionales; el frontend no tiene runner de tests configurado.
- Las secciones `Requirements` y `Scenario` de `spec.md` contienen comportamiento externo. Las referencias a implementación se mantienen aquí para que se pueda revisar la evidencia.

## Evidencia por requisito

| Requisito | Evidencia estática |
| --- | --- |
| Registro con credenciales válidas | `backend/app/validators/user.ts`, `backend/app/controllers/new_account_controller.ts`, `frontend/src/pages/register-page.tsx`, `frontend/src/auth/auth-provider.tsx` |
| Rechazo de registros inválidos | `backend/app/validators/user.ts`, `backend/database/migrations/1761885935168_create_users_table.ts`, `frontend/src/pages/register-page.tsx`, `frontend/src/lib/api.ts` |
| Inicio de sesión con credenciales | `backend/app/controllers/access_tokens_controller.ts`, `backend/app/validators/user.ts`, `frontend/src/auth/auth-provider.tsx`, `frontend/src/pages/login-page.tsx`, mixin instalado de `@adonisjs/auth` |
| Comunicación de errores en los formularios | `frontend/src/lib/api.ts`, `frontend/src/auth/use-auth-form.ts`, pantallas de registro y login |
| Persistencia y restauración de sesión | `frontend/src/auth/auth-provider.tsx`, `frontend/src/routes/protected-route.tsx`, `frontend/src/routes/public-only-route.tsx` |
| Acceso a las pantallas según la sesión | `frontend/src/routes/app-routes.tsx`, `frontend/src/routes/protected-route.tsx`, `frontend/src/routes/public-only-route.tsx` |
| Consulta del perfil propio | `backend/start/routes.ts`, `backend/app/middleware/auth_middleware.ts`, `backend/config/auth.ts`, `backend/app/controllers/profile_controller.ts`, `backend/app/transformers/user_transformer.ts`, `backend/providers/api_provider.ts`, guard instalado de `@adonisjs/auth` |
| Visualización del perfil | `frontend/src/pages/profile-page.tsx`, `frontend/src/lib/types.ts` |
| Cierre de sesión local | `frontend/src/auth/auth-provider.tsx`, `frontend/src/pages/profile-page.tsx`, `frontend/src/routes/protected-route.tsx` |
| Cierre autenticado en la API | `backend/start/routes.ts`, `backend/app/controllers/access_tokens_controller.ts`, `backend/config/auth.ts`, proveedor de tokens instalado de `@adonisjs/auth` |

La validación estructural estricta de OpenSpec pasa sin incidencias. Valida el formato de la spec, no la ejecución de los escenarios ni su aprobación contractual.

## Incoherencias encontradas

1. **Envoltorio de respuestas:** registro, login y perfil usan `{ data: ... }`; logout devuelve directamente `{ message: 'Logged out successfully' }`. Se ve en `backend/app/controllers/access_tokens_controller.ts` y `backend/providers/api_provider.ts`. El cliente de logout ignora el cuerpo. No se exige un envoltorio ni un mensaje literal en la spec de logout.
2. **Nombre opcional frente a clave requerida:** la pantalla permite no introducir nombre y envía `fullName: null`; el validador declara el campo nullable, pero no optional. Se ve en `frontend/src/pages/register-page.tsx`, `frontend/src/lib/types.ts` y `backend/app/validators/user.ts`.
3. **Caducidad anunciada frente a expiración no configurada:** el cliente traduce cualquier `401` como sesión caducada, pero la creación de tokens no configura un plazo de expiración. Se ve en `frontend/src/lib/api.ts`, `backend/app/models/user.ts` y los controladores de alta y login.
4. **Tipos de fecha:** el cliente tipa `updatedAt` como string, mientras que el esquema del backend permite `null`. Se ve en `frontend/src/lib/types.ts`, `backend/database/schema.ts` y la migración de usuarios. No se declara en la spec que ese campo siempre sea una cadena.
5. **PRD frente a superficie existente:** RF-1 del PRD describe la entrada automática al espacio compartido, pero la interfaz actual dirige al perfil y no implementa un espacio de tareas. Se ve en `docs/prd/flowsync-mvp.md` y `frontend/src/routes/app-routes.tsx`. No se incorpora ese objetivo futuro a la baseline.

## Observaciones que requieren decisión humana

Estos puntos son observaciones estáticas, no garantías contractuales aprobadas. La spec conserva el resultado actual cuando es necesario para explicar el flujo, sin resolver por inferencia su intención ni extenderlo a situaciones no comprobadas.

| Observación actual | Dos lecturas posibles / decisión pendiente |
| --- | --- |
| No se configura expiración en los tokens creados; la dependencia instalada solo fija expiración cuando recibe un plazo. | Sesión de duración indefinida deliberada, o política de caducidad aún no definida. No establecer una duración ni prometer validez indefinida. |
| Login y registro crean un token nuevo; logout borra solo el token presentado. | Sesiones independientes deliberadas, o cierre global esperado pero no implementado. La spec exige revocar el presentado; no garantiza qué debe ocurrir con todas las demás sesiones. |
| La interfaz cierra localmente y silencia el fallo de revocación. | Prioridad deliberada al cierre local incluso sin red, o cierre incompleto que debería avisar al usuario. El requisito local documenta el flujo existente, no garantiza revocación remota cuando falla la petición. |
| La restauración conserva la credencial ante fallos distintos de `401`, pero deja la interfaz anónima hasta recargar. | Recuperación manual deliberada mediante recarga, o falta de reintento automático. El comportamiento está explicado por comentarios del código; confirmar que se quiere preservar. |
| El nombre ausente debe representarse como `null` en la API, mientras que en pantalla se presenta como opcional. | Contrato explícito de payload, o consecuencia incidental de usar nullable sin optional. El escenario de alta usa el payload actualmente aceptado, sin declarar contractual el rechazo por omisión. |
| El login recibe una contraseña string sin los límites 8–32 del alta. | Verificación deliberada de credenciales existentes sin imponer la política de alta, o inconsistencia de validación. No trasladar automáticamente los límites del registro al login. |
| Las credenciales incorrectas generan `400` por la dependencia; el cliente traduce todos los `400` como error de credenciales. | Contrato de autenticación asumido por el cliente, o acoplamiento accidental a un valor por defecto y clasificación demasiado amplia. La spec describe el rechazo y el aviso, sin fijar `400` como garantía contractual. |
| Las iniciales dependen de separar el nombre por espacios y, sin nombre, el email por `@`. | Regla de identidad visual intencionada, o algoritmo provisional con resultados peculiares para nombres y espacios. La spec exige mostrar iniciales sin congelar su cálculo. |
| La pantalla formatea la fecha de alta con locale `es-ES`, sin zona horaria explícita. | Presentación localizada deliberada, o detalle visual dependiente del navegador. No congelar el texto exacto ni la fecha civil en una zona horaria concreta. |
| El nombre se recorta en el formulario y un resultado vacío se envía como `null`; no hay normalización explícita equivalente del email. | Normalización deliberada por campo, o comportamiento incidental. No prometer equivalencia de emails por mayúsculas, espacios o variantes sin revisar y ejecutar casos específicos. |
| El token se guarda en localStorage con la clave `flowsync.token`; no se observa escucha de cambios entre pestañas. | Persistencia como implementación intercambiable, o necesidad de sincronización de sesiones todavía no definida. La spec exige persistencia, no una tecnología ni sincronización instantánea entre pestañas. |
| Las rutas desconocidas se redirigen al perfil y luego se aplica su protección. | Página de entrada deliberada, o fallback provisional. No convertir todo URL desconocido en una ruta contractual de autenticación. |
| El guard web está configurado, pero estas rutas autentican por el guard API de tokens. | Soporte de sesión por cookies previsto para otro uso, o configuración de plantilla. No documentar login por cookie como funcionalidad existente de este vertical. |

## Límites de lo documentado

La baseline no afirma recuperación de contraseña, verificación de email, edición de perfil, renovación de tokens, cierre global, comprobaciones periódicas de sesión ni sincronización entre pestañas: no hay un flujo implementado de esas capacidades en la superficie explorada. Tampoco interpreta cualquier fallo posterior de API como cierre automático de sesión: la gestión del `401` que elimina la credencial se ha encontrado en la restauración inicial.

## Mantenimiento de la living spec

Al revisar esta baseline, contrastar los escenarios con ejecución y registrar por separado la aprobación humana de los puntos anteriores. Cuando cambie el comportamiento externo de este vertical, actualizar sus requisitos y escenarios, y reexaminar las dudas afectadas. Un refactor interno que preserve los resultados observables no requiere convertir sus nuevos detalles de implementación en requisitos.
