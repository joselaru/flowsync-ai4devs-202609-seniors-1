# 0001. Usar las delta-specs de OpenSpec como fuente de verdad viva

## Contexto

FlowSync ya utiliza el esquema `spec-driven` en [`openspec/config.yaml`](../../openspec/config.yaml). Hay dos especificaciones consolidadas: [`auth`](../../openspec/specs/auth/spec.md), que recoge el acceso, la sesión y la navegación protegida, y [`tasks`](../../openspec/specs/tasks/spec.md), que recoge la lista compartida, la creación y los estados de las tareas, el vencimiento y el filtro por estado. Sus requisitos usan `SHALL` y `NO SHALL`, con escenarios `WHEN`/`THEN` que concretan el comportamiento observable de la API y de la interfaz.

En `openspec/changes/` no hay changes activos en el momento de este ADR. El archivo conserva tres changes, todos con prefijo `2026-08-13`, y cada uno contiene `proposal.md`, `design.md`, `tasks.md` y delta-specs:

- [`add-task-list`](../../openspec/changes/archive/2026-08-13-add-task-list/): añade la capability `tasks` mediante `ADDED Requirements` y modifica `auth` para que el registro, el login y las redirecciones lleven a la lista; también añade el acceso al perfil desde ella.
- [`add-task-due-date`](../../openspec/changes/archive/2026-08-13-add-task-due-date/): añade a `tasks` el vencimiento opcional, su edición y la consulta de una tarea. El día de referencia lo aporta quien consulta mediante `today`; la lista no muestra el vencimiento. Modifica el requisito de una única vista para admitir el detalle de una tarea.
- [`add-task-status-filter`](../../openspec/changes/archive/2026-08-13-add-task-status-filter/): añade el filtro por estado y modifica requisitos existentes de la lista, su pantalla, sus estados vacíos y la única vista compartida. Sin filtro se muestran pendientes y en curso; las hechas se consultan por separado.

Las specs consolidadas incorporan esos deltas, pero los archivos históricos conservan las formulaciones de cada cambio. Por ejemplo, el delta de la lista decía que `GET /api/v1/tasks` devolvía todas las tareas; el delta del filtro sustituye esa regla por la vista de pendientes y en curso, que es la que figura hoy en `openspec/specs/tasks/spec.md`. No son contratos simultáneos: muestran la evolución del mismo requisito. La spec de `auth` contiene además requisitos de base que no se introdujeron en estos tres changes; el archivo disponible no reconstruye por sí solo todo el contrato del proyecto.

Existe un precedente concreto de deriva: la propuesta de vencimiento advierte que el filtro se había implementado sin actualizar la spec viva. La propuesta del filtro declara que documenta comportamiento ya implementado y corrige los requisitos que habían quedado falsos. Además, los changes de lista y vencimiento conservan tareas de verificación manual sin marcar, y las propuestas explicitan la ausencia de tests para esos cambios. Estar archivado no demuestra por sí solo que cada escenario esté verificado.

Necesitamos que el contrato evolucione con el producto y que cada modificación deje rastro de qué cambió y por qué, evitando que una descripción histórica o una implementación sin documentar se convierta accidentalmente en el contrato vigente.

## Decisión

Usaremos las **delta-specs de OpenSpec como fuente de verdad viva de la evolución del contrato funcional de FlowSync**. Cada cambio de comportamiento se expresará en `openspec/changes/<change>/specs/<capability>/spec.md`, con requisitos y escenarios que indiquen las adiciones, modificaciones, eliminaciones o renombrados que correspondan.

El contrato vigente se consultará en `openspec/specs/<capability>/spec.md`, como consolidación de la base y los deltas aceptados e incorporados. Durante un change, su delta define el contrato objetivo de ese trabajo sobre la base vigente; un borrador o un change pendiente no convierte automáticamente su contenido en comportamiento disponible. Antes de archivar un change, sincronizaremos sus deltas con las specs consolidadas y revisaremos su correspondencia con la implementación, dejando explícitas las verificaciones pendientes y las desviaciones conocidas.

Conservaremos los changes archivados como historial: `proposal.md` explica la motivación y el alcance, `design.md` las decisiones técnicas y sus compromisos, `tasks.md` el seguimiento del trabajo y las delta-specs la modificación del contrato. Los requisitos sustituidos del archivo no prevalecen sobre la spec consolidada. Los nuevos cambios se registrarán en nuevos deltas, sin reescribir el historial para hacerlo parecer siempre actual. Si dos changes modifican el mismo requisito, resolveremos su compatibilidad y orden de incorporación antes de consolidarlos.

El backlog y los documentos de producto aportan necesidades y contexto; el código y las pruebas aportan implementación y evidencia. Para decidir el comportamiento acordado usaremos el contrato de OpenSpec. Una discrepancia con el código se tratará como un defecto de implementación o como un cambio de contrato que exige un delta explícito, no como una actualización tácita de la verdad. Las decisiones arquitectónicas transversales seguirán registrándose en ADRs, como este.

## Estado

Reemplazada por el [ADR 0002: Usar los tests de integración como única fuente de verdad ejecutable](0002-tests-de-integracion-como-fuente-de-verdad.md).

## Consecuencias

- **Contrato compartido y revisable.** Producto, desarrollo y agentes pueden consultar los mismos requisitos y escenarios para acordar alcance y criterios de aceptación, incluidos límites deliberados como no mostrar el vencimiento en la lista o no ofrecer una opción «Todas».
- **Trazabilidad de la evolución.** La consolidación permite leer el contrato actual sin reconstruir todos los changes; el archivo permite entender su evolución y recuperar la motivación y los compromisos de cada cambio.
- **Coste de escritura y revisión.** Cada cambio funcional exige mantener requisitos y escenarios, revisar los efectos sobre otras capabilities y sincronizar la base al cerrar. Incluso una modificación pequeña añade trabajo documental al código.
- **Coste de coordinación.** Changes concurrentes pueden modificar el mismo requisito. Habrá que resolver conflictos semánticos, conservar los escenarios que sigan siendo válidos y acordar el orden de incorporación; fusionar Markdown sin conflictos de Git no garantiza un contrato coherente.
- **Riesgo de deriva entre representaciones.** Los deltas y las specs consolidadas contienen texto relacionado que debe mantenerse consistente con la implementación. El episodio del filtro demuestra que esa consistencia no es automática: esta decisión requiere disciplina continua y trabajo de reconciliación cuando se incumpla.
- **Coste de aprendizaje y lectura histórica.** El equipo debe distinguir base vigente, delta objetivo e historial, y aprender las convenciones de OpenSpec. Una búsqueda puede devolver una regla obsoleta del archivo; habrá que comprobar su vigencia antes de usarla.
- **La especificación no sustituye la verificación.** Los escenarios escritos no son pruebas ejecutadas y archivar no certifica su cumplimiento. Las tareas manuales pendientes y la ausencia de tests que constan en los changes mantienen un coste de verificación y una incertidumbre que deberán hacerse visibles al evaluar cada cambio.
