# 0002. Usar los tests de integración como única fuente de verdad ejecutable

## Contexto

Seis meses después de adoptar el [ADR 0001: Usar las delta-specs de OpenSpec como fuente de verdad viva](0001-openspec-como-fuente-de-verdad.md), el equipo decide revisar qué artefacto determina el contrato funcional verificable de FlowSync. Esta decisión se sitúa en ese escenario futuro; no certifica la cobertura de tests disponible al redactar estos documentos.

El ADR 0001 otorgaba a OpenSpec la autoridad sobre el comportamiento acordado y consideraba el código y las pruebas evidencia de su implementación. También reconocía el riesgo de deriva entre las especificaciones, los deltas y el código, y que los escenarios escritos y los changes archivados no demostraban por sí solos el cumplimiento del contrato.

El equipo quiere que el contrato verificable se exprese mediante comprobaciones ejecutables y que su cumplimiento se evalúe de forma reproducible. OpenSpec sigue siendo útil para explicar las necesidades, el alcance y la motivación de los cambios, pero deja de determinar el contrato vigente.

## Decisión

Usaremos los **tests de integración como única fuente de verdad ejecutable del contrato funcional de FlowSync**. Los casos aceptados y versionados en la suite de integración definirán el comportamiento exigido y sus resultados aportarán evidencia de cumplimiento. Los cambios de comportamiento deberán incluir la incorporación o actualización de esos tests y su ejecución satisfactoria antes de considerarse completados.

Los tests comprobarán comportamiento observable en la integración de los componentes, incluidos los casos de error y los límites relevantes. El código de producción será la implementación de ese contrato. Otras pruebas podrán aportar evidencia complementaria, pero no sustituirán a los tests de integración como autoridad contractual.

OpenSpec quedará **solo como documentación de intención**: sus propuestas, diseños, tareas, specs y delta-specs explicarán lo que se pretende construir y por qué. Podrá actualizarse para reflejar esa intención, pero ni una spec consolidada ni un delta aceptado o archivado constituirán por sí solos un contrato ejecutable o una prueba de cumplimiento.

Si OpenSpec y los tests de integración discrepan, prevalecerá el contrato expresado en los tests aceptados. Revisaremos la discrepancia: si la intención requiere cambiar el comportamiento, modificaremos explícitamente los tests y la implementación; si la documentación quedó desactualizada, corregiremos la documentación vigente. No alteraremos tests automáticamente para hacer pasar una implementación divergente. Un comportamiento sin cobertura de integración será una laguna del contrato ejecutable que habrá que cubrir, no una garantía implícita derivada de OpenSpec ni del código existente.

Este ADR **reemplaza al ADR 0001** en cuanto a la autoridad del contrato funcional y al papel de OpenSpec. Conservaremos el ADR 0001 y los changes archivados como registros históricos de las decisiones e intenciones de su momento, sin reescribirlos para aparentar que esta política siempre estuvo vigente. Las decisiones arquitectónicas transversales seguirán registrándose en ADRs.

## Estado

Aceptada en el escenario futuro descrito. Reemplaza al [ADR 0001](0001-openspec-como-fuente-de-verdad.md), cuyo estado queda marcado como reemplazado por este ADR.

## Consecuencias

- **Contrato verificable y reproducible.** La suite de integración permite comprobar automáticamente el comportamiento exigido y detectar regresiones. La aceptación de un cambio requiere evidencia de ejecución, no solo escenarios redactados o tareas marcadas.
- **Una autoridad explícita.** Ante discrepancias, el equipo consulta los tests de integración para determinar el contrato ejecutable. OpenSpec conserva la motivación y la intención sin competir por esa autoridad.
- **Coste de cobertura y mantenimiento.** Habrá que traducir los comportamientos relevantes a tests de integración, mantener datos y entornos reproducibles y controlar la inestabilidad y el tiempo de ejecución de la suite.
- **Transición con lagunas visibles.** Adoptar esta decisión no crea cobertura automáticamente. El equipo deberá identificar los escenarios todavía no cubiertos y priorizar su incorporación; una suite verde solo aporta evidencia sobre los casos que realmente comprueba.
- **Menor accesibilidad del contrato.** Leer tests puede exigir más conocimiento técnico que leer requisitos en lenguaje natural. OpenSpec seguirá ayudando a comunicar la intención a producto y a quienes no trabajan directamente con la suite.
- **La documentación puede divergir.** Mantener OpenSpec útil seguirá requiriendo revisión, aunque su desactualización ya no cambie el contrato ejecutable. Los errores en los propios tests también requerirán revisión explícita: ser la fuente de verdad no los hace infalibles.
- **Trazabilidad histórica preservada.** Los enlaces recíprocos entre los ADR 0001 y 0002 permiten entender la sustitución de la decisión sin perder el contexto, la decisión ni las consecuencias originales.
