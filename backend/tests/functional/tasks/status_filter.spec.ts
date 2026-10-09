import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Cubre «Estado inventado» del filtro por estado de
 * `openspec/specs/tasks/spec.md`.
 */
test.group('Tasks | filtro por estado', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('un estado inventado se rechaza con un error sobre status', async ({ client, assert }) => {
    const registro = await client.post('/api/v1/auth/signup').json({
      fullName: 'Ada Lovelace',
      email: 'ada-filtro@example.com',
      password: 'secreto123',
      passwordConfirmation: 'secreto123',
    })
    registro.assertStatus(200)

    const { token } = registro.body().data
    const lista = await client
      .get('/api/v1/tasks')
      .qs({ status: 'archivado' })
      .header('Authorization', `Bearer ${token}`)

    lista.assertStatus(422)
    lista.assertBodyContains({ errors: [{ field: 'status' }] })
    assert.notProperty(lista.body(), 'data', 'El error no debe devolver una lista de tareas')
  })
})
