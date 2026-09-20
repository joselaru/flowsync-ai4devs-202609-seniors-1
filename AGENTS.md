# FlowSync - Instrucciones para el agente

## Antes de realizar cambios

1. Antes de modificar código, estudia la estructura, los patrones y las convenciones existentes del proyecto.
2. Si encuentras una ambigüedad relevante que no puedas resolver examinando el código existente, pregunta antes de asumir una respuesta.
3. Prioriza soluciones simples, robustas y seguras. Reutiliza los patrones existentes del proyecto y evita complejidad innecesaria.
4. No inventes requisitos, APIs, estructuras de datos ni comportamientos que no estén respaldados por el ticket o por el código existente.

## Alcance

- El backend es de solo lectura para este ejercicio.
- Puedes consultar el backend para comprender contratos de API, validaciones y comportamiento.
- No modifiques archivos del backend.
- Los cambios de implementación deben realizarse únicamente en el frontend.

## Verificación

Después de implementar cambios en el frontend:

1. Comprueba que la implementación cumple el ticket y todos sus criterios de aceptación.
2. Desde el directorio `frontend`, ejecuta `npm run lint`.
3. Desde el directorio `frontend`, ejecuta `npm run build`.
4. Si alguna comprobación falla, investiga el motivo y corrige los problemas provocados por tus cambios antes de considerar terminada la tarea.
5. Una vez completada la implementación y superadas las validaciones requeridas, invoca al subagente `revisor` para realizar una revisión independiente de los cambios.
6. No corrijas automáticamente los hallazgos del subagente `revisor`. Informa de ellos para que puedan ser evaluados antes de realizar cambios adicionales.
7. Al finalizar, informa del resultado de las comprobaciones realizadas y de los hallazgos del subagente `revisor`.