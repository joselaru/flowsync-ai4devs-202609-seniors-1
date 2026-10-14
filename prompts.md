
## Prompt 1

**Modelo:** GPT-6.1 Sol (medium)
**Herramienta:** OpenCode

```text
Te voy a pasar 5 reglas que son
1) La rama es por unidad de trabajo, no por petición. Antes de tocar código, mira en qué rama estás: si ya es una rama de trabajo —cualquiera que no sea main ni una sN/*—, sigue en ella en vez de crear otra. Solo desde main o desde una sN/* se crea una nueva (git checkout -b feat/<slug>). Nunca commitear directo en main ni en una sN/*.
2) El commit sí es por petición: al cerrar cada una, usar la skill /commit.
3) Un cambio que toque rutas, controladores, validadores o transformers de una capability se cierra en el mismo commit con el documento OpenAPI y el README de esa capability al día. El documento se construye en cada petición y no hay fichero que generar, así que lo que se commitea es el diff regenerado de .adonisjs/; el README es docs/capabilities/<nombre>/README.md.
4)gh pr create (con una descripción completa de los cambios en el cuerpo del PR) y el pase del subagente adversarial-reviewer sobre ese PR van una sola vez, al terminar la unidad de trabajo, no al cerrar cada petición. El review adversarial es lo último, antes de dar la unidad por terminada.
5) Cuando abras el PR, no repitas ese resumen en el chat: la sesión se va a perder, el PR no. Responde solo con la URL del PR.

el objetivo es comprobar si se cumplieron en los ultimos 15 commit. Para darme la respuesta argumentalo con evidencias. No debes tocar ni modificar el código, actúa solo en modo lectura. Muestrame la información en una tabla para mejor compresión.
```

**Qué salió:** El agente analizó los últimos 15 commits y presentó en formato tabla los datos relativos a cada regla, con evidencias cuando las ha encontrado e indicaciones de la verificabilidad para cada una de ellas.

## Prompt 2

**Modelo:** GPT-6.1 Sol (medium)
**Herramienta:** OpenCode

```text
A partir de los datos anteriores crea una tabla con dos columnas, de nombre 'que recomienda el agente', 'decision humana' , quiero que me rellenes la columna 'que recomienda el agente' para cada una de las reglas con la opción que tu tomarías para cada regla, si Dejarla, Borrarla, o Convertirla en comprobación argumentando brevemente el porque, la columna 'decisión humana' se deja vacía para ser rellenada por mi
```

**Qué salió:** El agente recomendó convertir las reglas 1–4 en comprobaciones y mantener la regla 5. La decisión humana sobre la regla 4 fue distinta.
