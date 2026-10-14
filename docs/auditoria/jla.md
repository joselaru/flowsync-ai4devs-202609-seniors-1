# Auditoría M5 — Reglas de proceso

## Alcance

Auditoría en modo lectura de las cinco reglas de proceso de `CLAUDE.md`, contrastadas con los últimos 15 commits alcanzables desde `HEAD` en la rama `auditoria-jla` (de `a3bb962` a `b955a72`). No se han modificado reglas ni código como parte de la auditoría.

## Expectativas iniciales

Registradas antes de consultar el historial de commits.

| Regla | Expectativa |
|---|---|
| 1. Rama por unidad de trabajo; no commitear en `main` ni `sN/*` | Ni idea |
| 2. Commit por petición usando `/commit` | Ni idea |
| 3. OpenAPI, README y archivos generados al día en el mismo commit | Ni idea |
| 4. Una PR y revisión con `adversarial-reviewer` al terminar la unidad | Ni idea |
| 5. Responder solo con la URL de la PR | Ni idea |

## Parte A — Auditoría de las reglas

Los veredictos se expresan usando únicamente las tres categorías solicitadas. «No se puede comprobar» no equivale a «no se cumple».

| Regla | Comando o archivo comprobado | Veredicto | Evidencia | Qué haría (decisión humana) |
|---|---|---|---|---|
| **1.** Una rama por unidad de trabajo; no commitear en `main` ni `sN/*` | `git log -15`, `git reflog --all`, referencias de ramas; `CLAUDE.md` | **No se puede comprobar con la información disponible** | Git conserva commits y relaciones, pero no demuestra en qué rama se crearon. El reflog disponible no acredita el origen de estos commits. La regla figura desde `0e56705`. | **Convertirla en comprobación automática.** Comprobar y bloquear commits directos en ramas base donde sea posible. |
| **2.** Un commit por petición usando `/commit` | `git log -15`, mensajes de commits, `prompts.md` | **No se puede comprobar con la información disponible** | Los mensajes tienen formato convencional, pero eso no demuestra que se invocó `/commit` ni permite asociar una petición a un commit. | **Convertirla en comprobación automática.** Registrar petición, invocación de la skill y commit asociado. |
| **3.** Actualizar OpenAPI, README y diff generado `.adonisjs/` cuando aplique | `git show` y `git diff-tree --no-commit-id --name-only -r` sobre `cbe9617` y `4e03d1f`; `git show 160fbc7` | **No se puede comprobar con la información disponible** (cumplimiento completo) | **Comprobación manual:** `cbe9617` modifica tres controladores, `backend/app/openapi/schemas.ts`, `backend/config/openapi.ts`, `backend/package.json` y `docs/capabilities/tasks/README.md` en un mismo commit. No demuestra por sí solo que el OpenAPI resultante sea correcto ni que se haya regenerado `.adonisjs/`. `4e03d1f` solo modifica `backend/app/transformers/task_transformer.ts`, sin documentación; **es anterior** a la incorporación de la regla en `160fbc7`, por lo que no se considera incumplimiento de una regla aún no vigente. | **Convertirla en comprobación automática.** Validar la sincronización de OpenAPI y los generados; revisar el README cuando cambie una capability. |
| **4.** Una PR por unidad y revisión adversarial al finalizar | Asociaciones commit–PR consultadas por OpenCode en GitHub; `git log -15`; `.claude/agents/adversarial-reviewer.md` | **No se puede comprobar con la información disponible** | No hay evidencia suficiente de una PR específica por unidad ni de cuándo se ejecutó el subagente. `8f9e715` modifica la configuración del revisor, pero no acredita una revisión ejecutada. | **Borrarla en su formulación actual.** Prefiero que la revisión adversarial sea un paso de validación solicitado expresamente por el humano. Mantendría la creación de la PR como procedimiento independiente. |
| **5.** Tras abrir la PR, responder solo con su URL | Historial de Git y `prompts.md` | **No se puede comprobar con la información disponible** | La respuesta final pertenece al chat y no queda acreditada por los commits ni por la plantilla de `prompts.md`. | **Dejarla.** Es una convención sencilla para que el resumen duradero esté en la PR. |

### Evidencia contrastada personalmente

Ejecuté estos comandos de solo lectura, sin depender únicamente de la explicación del agente:

```bash
git diff-tree --no-commit-id --name-only -r cbe9617
git diff-tree --no-commit-id --name-only -r 4e03d1f
```

En `cbe9617` comprobé que aparecen controladores, archivos OpenAPI y `docs/capabilities/tasks/README.md`. En `4e03d1f` aparece solo `backend/app/transformers/task_transformer.ts`. La segunda observación no se presenta como incumplimiento histórico, porque ese commit es anterior a la regla 3.

## Parte B — Tres conclusiones obligatorias

**1. Mayor diferencia entre expectativa y evidencia.** No hubo ninguna expectativa equivocada porque marqué «Ni idea» en las cinco reglas. Preferí no asumir nada.

**2. Regla que no se puede comprobar y qué cambiaría para verificarla.** Si no se puede comprobar con la información disponible, debería avisar el agente indicando, a título informativo, que la **regla 2 (usar `/commit` por petición)** no dispone de evidencias suficientes y que sea el humano el que ya esté al tanto. **Para poder verificarla**, haría falta registrar la invocación de `/commit` y relacionarla con la petición y el hash del commit; el aviso al humano, por sí solo, no demuestra su cumplimiento.

**3. Regla que eliminaría y por qué.** Eliminaría la regla 4 en su formulación actual; prefiero que la revisión adversarial sea un paso de validación solicitado expresamente por el humano. Mantendría la creación de la PR como procedimiento independiente.

## Nota sobre las decisiones

La columna «Qué haría» contiene mis decisiones humanas después de escuchar las recomendaciones del agente. Coincido con sus recomendaciones para las reglas 1, 2, 3 y 5; para la 4 mantengo un criterio distinto por el factor humano. Estas son recomendaciones de proceso, **no cambios ejecutados en el repositorio**.
