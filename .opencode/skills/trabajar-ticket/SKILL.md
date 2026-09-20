---
name: trabajar-ticket
description: Analiza un ticket de Jira y prepara un plan de implementación fundamentado en sus criterios de aceptación y en el código existente. Úsala cuando se solicite trabajar, analizar o preparar la implementación de un ticket de Jira.
---

# Trabajar ticket de Jira

## Objetivo

Analizar un ticket de Jira y preparar un plan de implementación antes de realizar cambios en el código.

## Procedimiento

1. Obtén el ticket de Jira mediante el MCP disponible.
2. Identifica la historia de usuario y todos sus criterios de aceptación.
3. Detecta requisitos ambiguos, incompletos o que no puedan deducirse de forma fiable.
4. Inspecciona únicamente las partes del repositorio necesarias para entender cómo implementar el ticket.
5. Identifica los patrones, contratos y convenciones existentes que sean relevantes.
6. Determina qué áreas o archivos serían afectados por la implementación.
7. Prepara un plan concreto de implementación basado en el ticket y en el código existente.

## Resultado

Informa de forma clara:

- Objetivo del ticket.
- Criterios de aceptación.
- Ambigüedades o dudas detectadas.
- Áreas o archivos que previsiblemente se verán afectados.
- Plan de implementación propuesto.

No implementes ningún cambio todavía. Espera la confirmación del usuario antes de continuar.