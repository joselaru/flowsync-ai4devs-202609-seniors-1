import Task from '#models/task'
import { setTaskDueDateValidator, toCalendarDay } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskDetailTransformer from '#transformers/task_detail_transformer'
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
} from '@foadonis/openapi/decorators'
import { calendarDaySchema, schemaRef } from '../openapi/schemas.js'

@ApiSecurity('bearerAuth')
@ApiResponse({
  status: 401,
  description: 'Token de acceso ausente o inválido.',
  type: schemaRef('ApiError'),
})
export default class TaskDueDatesController {
  /**
   * Fijar, cambiar y retirar la fecha de vencimiento son la misma operación, y
   * por eso comparten endpoint: quitar la fecha no es borrar un recurso, es
   * poner el valor «sin fecha», que es un valor legítimo del campo.
   *
   * Endpoint propio en vez de un update genérico de la tarea, por el mismo
   * motivo que el estado: por ahí se colarían el título y el responsable, que
   * este change no permite tocar.
   *
   * Cualquiera con sesión puede cambiar la fecha de cualquier tarea, igual que
   * el estado. No se comprueba quién es el responsable.
   */
  @ApiOperation({
    summary: 'Fijar, cambiar o retirar la fecha',
    description:
      'Cualquier cuenta puede modificar cualquier tarea. null retira la fecha; se aceptan fechas pasadas. Título, responsable y estado no cambian. La respuesta recalcula el vencimiento contra today.',
  })
  @ApiQuery({
    name: 'today',
    required: false,
    schema: calendarDaySchema,
    description:
      'Día de referencia válido, obligatorio en query o en el cuerpo. Si falta en ambos, se responde 422.',
  })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['dueDate'],
      properties: { dueDate: { ...calendarDaySchema, nullable: true }, today: calendarDaySchema },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tarea con fecha y vencimiento actualizados.',
    type: schemaRef('TaskDetailResponse'),
  })
  @ApiResponse({ status: 404, description: 'La tarea no existe.' })
  @ApiResponse({
    status: 422,
    description: 'dueDate ausente o inválida, o today ausente o inválido. No se modifica la tarea.',
    type: schemaRef('ValidationError'),
  })
  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { today, dueDate } = await request.validateUsing(setTaskDueDateValidator)

    // El `DateTime` del validador se queda aquí: hacia dentro, una fecha de
    // vencimiento es un día en texto y nunca un instante.
    task.dueDate = dueDate === null ? null : toCalendarDay(dueDate)
    await task.save()
    await task.load('assignee')

    // Se devuelve ya resuelta contra el día de quien pide, para que aplazar una
    // tarea vencida deje de mostrarla vencida en esta misma respuesta.
    return serialize(TaskDetailTransformer.transform(task, toCalendarDay(today)))
  }
}
