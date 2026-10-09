import Task, { DEFAULT_LIST_STATUSES } from '#models/task'
import {
  createTaskValidator,
  listTasksValidator,
  taskReferenceDayValidator,
  toCalendarDay,
} from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
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
export default class TasksController {
  /**
   * La lista del espacio: una sola, la misma para todo el mundo, sin filtrar
   * por quién la pide. El responsable va precargado en la misma consulta —
   * es el 100 % de los accesos y resolverlo tarea a tarea sería el error caro
   * y evidente aquí.
   *
   * Admite acotarse por estado, y aquí hay tres caminos que no se cruzan:
   * un estado válido devuelve solo el suyo (aunque no haya ninguna, y eso es
   * una lista vacía legítima, no un error); no pedir nada devuelve lo que
   * sigue abierto; y un estado que no existe ni siquiera llega, porque el
   * validador lo corta antes con un 422. Devolverlo vacío sería el fallo
   * silencioso que esta lista no se puede permitir.
   *
   * Acotar es solo lectura: ninguna tarea cambia por consultarla.
   */
  @ApiOperation({
    summary: 'Listar las tareas del equipo',
    description:
      'Lista compartida completa, sin paginación, ordenada por creación descendente. Sin filtro devuelve pending e in_progress, nunca done. No incluye vencimiento ni exige today. Solo lectura, sin permisos por responsable.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: 'string',
    enum: ['pending', 'in_progress', 'done'],
    description: 'Un único estado. Si se omite, pendientes y en curso.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa, también cuando está vacía.',
    type: schemaRef('TaskListResponse'),
  })
  @ApiResponse({
    status: 422,
    description: 'status no es un estado válido.',
    type: schemaRef('ValidationError'),
  })
  async index({ request, serialize }: HttpContext) {
    const { status } = await request.validateUsing(listTasksValidator)

    const query = Task.query().preload('assignee')

    if (status) {
      query.where('status', status)
    } else {
      // Sin filtro no es «todas»: lo hecho se queda fuera.
      query.whereIn('status', [...DEFAULT_LIST_STATUSES])
    }

    const tasks = await query
      .orderBy('createdAt', 'desc')
      // Desempate estable: dos tareas creadas en el mismo milisegundo tienen
      // la misma marca de tiempo, y sin esto su orden relativo sería el que
      // quisiera la base de datos.
      .orderBy('id', 'desc')

    return serialize(TaskTransformer.transform(tasks))
  }

  /**
   * Una tarea suelta, con todo lo que tiene: es la única lectura que informa
   * del vencimiento, y por eso es la única que exige el día de quien mira.
   */
  @ApiOperation({
    summary: 'Consultar una tarea',
    description:
      'Cualquier cuenta puede consultar cualquier tarea sin modificarla. El vencimiento se calcula contra today, nunca contra el reloj del servidor.',
  })
  @ApiQuery({
    name: 'today',
    required: true,
    schema: calendarDaySchema,
    description: 'Día de referencia válido de quien consulta, AAAA-MM-DD.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tarea con fecha nullable y condición de vencida.',
    type: schemaRef('TaskDetailResponse'),
  })
  @ApiResponse({ status: 404, description: 'La tarea no existe.' })
  @ApiResponse({
    status: 422,
    description: 'today ausente, mal formado o imposible.',
    type: schemaRef('ValidationError'),
  })
  async show({ params, request, serialize }: HttpContext) {
    const { today } = await request.validateUsing(taskReferenceDayValidator)
    const task = await Task.findOrFail(params.id)
    await task.load('assignee')

    return serialize(TaskDetailTransformer.transform(task, toCalendarDay(today)))
  }

  /**
   * Crear cuesta un título. El responsable y el estado no se leen de la
   * petición ni aunque vengan: los pone el sistema.
   */
  @ApiOperation({
    summary: 'Crear una tarea con su título',
    description:
      'El responsable es quien crea la tarea; nace pending y sin fecha. Los campos adicionales de responsable, estado o fecha se ignoran. Se recortan espacios de los extremos del título, nunca su contenido para ajustarlo al máximo.',
  })
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          description: 'Entre 1 y 200 caracteres después de quitar espacios de los extremos.',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Tarea creada.', type: schemaRef('TaskResponse') })
  @ApiResponse({
    status: 422,
    description: 'title ausente, vacío, de solo espacios o demasiado largo.',
    type: schemaRef('ValidationError'),
  })
  async store({ request, response, auth, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)
    const user = auth.getUserOrFail()

    // El estado va explícito y no se deja al valor por defecto de la columna:
    // el modelo recién creado no vuelve a leerse de la base de datos, así que
    // ese defecto no llegaría a la respuesta.
    const task = await Task.create({ title, status: 'pending', assigneeId: user.id })
    await task.load('assignee')

    // El estado se marca aparte y el cuerpo se devuelve: `serialize()` entrega
    // una promesa que resuelve el pipeline al devolverla, y pasársela a
    // `response.created()` deja la respuesta con el cuerpo vacío.
    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }
}
