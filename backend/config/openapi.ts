import { defineConfig } from '@foadonis/openapi'
import { taskSchemas } from '../app/openapi/schemas.js'

export default defineConfig({
  ui: 'scalar',
  document: {
    // El generador omite ApiBody.required; el merge conserva esta anotación.
    paths: {
      '/api/v1/tasks': {
        post: { requestBody: { required: true, content: {} }, responses: {} },
      },
      '/api/v1/tasks/{id}/status': {
        patch: { requestBody: { required: true, content: {} }, responses: {} },
      },
      '/api/v1/tasks/{id}/due-date': {
        put: { requestBody: { required: true, content: {} }, responses: {} },
      },
    },
    components: {
      schemas: taskSchemas,
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
      },
    },
    info: {
      title: 'FlowSync API',
      version: '0.1.0',
    },
  },
})
