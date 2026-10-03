import Task from '#models/task'
import TaskTransformer from '#transformers/task_transformer'
import TaskDetailTransformer from '#transformers/task_detail_transformer'
import { createTaskValidator, updateDueDateValidator } from '#validators/task'
import db from '@adonisjs/lucid/services/db'
import type { HttpContext } from '@adonisjs/core/http'

export default class TasksController {
  private taskId(value: string): number | null {
    if (!/^[1-9]\d*$/.test(value)) return null
    const id = Number(value)
    return Number.isSafeInteger(id) ? id : null
  }

  async show({ params, response, serialize }: HttpContext) {
    const id = this.taskId(params.id)
    const task = id === null ? null : await Task.query().where('id', id).preload('assignee').first()
    if (!task) return response.notFound({ message: 'La tarea no existe.' })
    return serialize(TaskDetailTransformer.transform(task))
  }

  async updateDueDate({ params, request, response, serialize }: HttpContext) {
    const id = this.taskId(params.id)
    if (id === null) return response.notFound({ message: 'La tarea no existe.' })
    const { dueDate, expectedDueDate, expectedStatus } =
      await request.validateUsing(updateDueDateValidator)
    return db.transaction(async (trx) => {
      // First statement is the conditional write: no read-to-write lock upgrade.
      const query = trx.from('tasks').where('id', id).where('status', expectedStatus)
      if (expectedDueDate === null) query.whereNull('due_date')
      else query.where('due_date', expectedDueDate)
      // Lucid's generic builder types updates as rows; SQLite returns a count.
      const affected: unknown = await query.update({ due_date: dueDate })
      if (typeof affected !== 'number') throw new Error('Expected SQLite update count')
      const task = await Task.query({ client: trx }).where('id', id).preload('assignee').first()
      if (!task) return response.notFound({ message: 'La tarea no existe.' })
      if (affected === 0) {
        response.status(409)
        return serialize.withoutWrapping({
          code: 'TASK_CONFLICT',
          message: 'La fecha o el estado han cambiado. Consulta los cambios antes de guardar.',
        })
      }
      return serialize(TaskDetailTransformer.transform(task))
    })
  }

  async index({ serialize }: HttpContext) {
    const tasks = await Task.query()
      .whereIn('status', ['pending', 'in_progress'])
      .preload('assignee')
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')

    return serialize(TaskTransformer.transform(tasks))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)
    const task = await Task.create({
      title,
      assigneeId: auth.getUserOrFail().id,
      status: 'pending',
    })
    await task.refresh()
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }
}
