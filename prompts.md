# Prompts

Aquí van todos los prompts que lancé para hacer el ejercicio, en el orden en que los lancé, con el modelo y la herramienta utilizada.

## Prompt 1

**Modelo:** GPT-6.1 Sol (medium)  
**Herramienta:** OpenCode

```
Quiero que investigues en profundidad los 3 escenarios que son: Responsable identificable, La tarea no filtra datos de cuenta y Responsable sin nombre. Empieza detectando los test de cada escenario que cubren y cumplen. Cumplir significa tener evidencia y decir cuál es la evidencia. A partir de esto crea una matriz de trazabilidad.
```

**Qué salió:** demasiada info, podía haber acotado más el prompt.

## Prompt 2

**Modelo:** GPT-6.1 Sol (medium)  
**Herramienta:** OpenCode

```
Escribe los test que faltan para los escenarios que estamos trabajando bajo estas criterios:
- Un test por escenario.
- Los tests irán en backend parte de test parte de tareas.
- Sigue la línea de los tests anteriores.
- Ejecútalos y comprueba el resultado.
- Si falla notifícalo pero no toques código del proyecto solo de los propios casos de test.
- Termina con un resumen final.
```

**Qué salió:** los test fenomenales, qué capacidad !!!!, peero hizo cosas que yo no le dije creó una rama, commit ... Debería haber puesto algun guardarail en el prompt o tocar el agents.md o revisor ...