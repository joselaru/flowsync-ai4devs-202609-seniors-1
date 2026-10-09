import type { OpenAPIV3 } from 'openapi-types'
import { TASK_STATUSES } from '#models/task'

export const calendarDaySchema: OpenAPIV3.SchemaObject = {
  type: 'string',
  format: 'date',
  pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  example: '2026-09-30',
}

export const taskSchemas = {
  TaskAssignee: {
    type: 'object',
    required: ['id', 'fullName', 'initials'],
    additionalProperties: false,
    properties: {
      id: { type: 'integer' },
      fullName: { type: 'string', nullable: true },
      initials: { type: 'string' },
    },
    description: 'Identidad pública del responsable, sin email ni datos de acceso.',
  },
  Task: {
    type: 'object',
    required: ['id', 'title', 'status', 'assignee', 'createdAt', 'updatedAt'],
    additionalProperties: false,
    properties: {
      id: { type: 'integer' },
      title: { type: 'string', minLength: 1, maxLength: 200 },
      status: { type: 'string', enum: [...TASK_STATUSES] },
      assignee: { $ref: '#/components/schemas/TaskAssignee' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },
  TaskDetail: {
    type: 'object',
    required: [
      'id',
      'title',
      'status',
      'assignee',
      'createdAt',
      'updatedAt',
      'dueDate',
      'isOverdue',
    ],
    additionalProperties: false,
    properties: {
      id: { type: 'integer' },
      title: { type: 'string', minLength: 1, maxLength: 200 },
      status: { type: 'string', enum: [...TASK_STATUSES] },
      assignee: { $ref: '#/components/schemas/TaskAssignee' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time', nullable: true },
      dueDate: { ...calendarDaySchema, nullable: true },
      isOverdue: {
        type: 'boolean',
        description:
          'Tiene fecha anterior a today y su estado no es done. Se calcula en cada consulta.',
      },
    },
  },
  TaskResponse: {
    type: 'object',
    required: ['data'],
    properties: { data: { $ref: '#/components/schemas/Task' } },
  },
  TaskDetailResponse: {
    type: 'object',
    required: ['data'],
    properties: { data: { $ref: '#/components/schemas/TaskDetail' } },
  },
  TaskListResponse: {
    type: 'object',
    required: ['data'],
    properties: {
      data: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
    },
  },
  ValidationError: {
    type: 'object',
    required: ['errors'],
    properties: {
      errors: {
        type: 'array',
        items: {
          type: 'object',
          required: ['message', 'rule', 'field'],
          properties: {
            message: { type: 'string' },
            rule: { type: 'string' },
            field: { type: 'string' },
            meta: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  },
  ApiError: {
    type: 'object',
    required: ['errors'],
    properties: {
      errors: {
        type: 'array',
        items: {
          type: 'object',
          required: ['message'],
          properties: { message: { type: 'string' } },
        },
      },
    },
  },
} satisfies Record<string, OpenAPIV3.SchemaObject>

// El loader JSONSchema del paquete permite referencias sin duplicar los esquemas.
export const schemaRef = (name: keyof typeof taskSchemas) => ({
  toJSONSchema: () => ({ $ref: `#/components/schemas/${name}` }),
})
