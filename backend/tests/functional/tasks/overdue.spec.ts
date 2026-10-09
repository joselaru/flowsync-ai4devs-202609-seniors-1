import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Cubre «Una tarea hecha con la fecha pasada» de
 * `openspec/specs/tasks/spec.md`.
 */
test.group('Tasks | vencimiento', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('una tarea hecha con la fecha pasada no está vencida', async ({ client, assert }) => {
    const today = '2026-10-06'
    const dueDate = '2026-10-05'
    const registro = await client.post('/api/v1/auth/signup').json({
      fullName: 'Ada Lovelace',
      email: 'ada-vencimiento@example.com',
      password: 'secreto123',
      passwordConfirmation: 'secreto123',
    })
    registro.assertStatus(200)

    const { token } = registro.body().data
    const creacion = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${token}`)
      .json({ title: 'Revisar el informe' })
    creacion.assertStatus(201)

    const tarea = creacion.body().data
    if (Array.isArray(tarea)) {
      throw new Error('La creación debe devolver una tarea, no una lista')
    }

    const fecha = await client
      .put(`/api/v1/tasks/${tarea.id}/due-date`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)
      .json({ dueDate })
    fecha.assertStatus(200)

    const estado = await client
      .patch(`/api/v1/tasks/${tarea.id}/status`)
      .header('Authorization', `Bearer ${token}`)
      .json({ status: 'done' })
    estado.assertStatus(200)

    const detalle = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today })
      .header('Authorization', `Bearer ${token}`)
    detalle.assertStatus(200)
    detalle.assertBodyContains({ data: { id: tarea.id, status: 'done', dueDate } })
    assert.isFalse(detalle.body().data.isOverdue, 'Una tarea hecha no está vencida')
  })
})
