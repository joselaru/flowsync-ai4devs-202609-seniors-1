import Task from '#models/task'
import { updateTaskStatusValidator } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { ApiBody, ApiOperation, ApiResponse, ApiSecurity } from '@foadonis/openapi/decorators'
import { schemaRef } from '../openapi/schemas.js'

@ApiSecurity('bearerAuth')
@ApiResponse({
  status: 401,
  description: 'Token de acceso ausente o inválido.',
  type: schemaRef('ApiError'),
})
export default class TaskStatusesController {
  /**
   * El estado es lo único mutable de una tarea en este momento, y por eso
   * tiene endpoint propio en vez de colgar de un update genérico: por ese
   * update acabarían colándose el título y el responsable, que son historias
   * que todavía no se han especificado.
   *
   * Cualquier persona con sesión puede cambiar el estado de cualquier tarea,
   * en cualquier dirección. No hay permisos por responsable ni transiciones
   * prohibidas: volver de «hecho» a «pendiente» es justamente lo que arregla
   * un clic dado por error.
   */
  @ApiOperation({
    summary: 'Cambiar el estado de una tarea',
    description:
      'Cualquier cuenta puede cambiar cualquier tarea entre los tres estados, incluida la vuelta desde done. No cambia título, responsable ni fecha. Esta respuesta no incluye vencimiento.',
  })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: ['pending', 'in_progress', 'done'] } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tarea con el estado actualizado.',
    type: schemaRef('TaskResponse'),
  })
  @ApiResponse({ status: 404, description: 'La tarea no existe.' })
  @ApiResponse({
    status: 422,
    description: 'status ausente o inválido.',
    type: schemaRef('ValidationError'),
  })
  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { status } = await request.validateUsing(updateTaskStatusValidator)

    task.status = status
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
