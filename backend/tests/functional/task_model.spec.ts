import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Task from '#models/task'
import User from '#models/user'

test.group('Task persistence', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('persists title, state and assignee relationship', async ({ assert }) => {
    const user = await User.create({
      fullName: 'Ada',
      email: 'ada@example.com',
      password: 'password123',
    })
    const task = await Task.create({
      title: '  Revisar pagos  ',
      assigneeId: user.id,
      status: 'pending',
    })
    const saved = await Task.query().where('id', task.id).preload('assignee').firstOrFail()

    assert.equal(saved.title, '  Revisar pagos  ')
    assert.equal(saved.status, 'pending')
    assert.equal(saved.assignee.id, user.id)
    assert.isNotNull(saved.createdAt)
  })

  test('database rejects a state outside the fixed three', async ({ assert }) => {
    const user = await User.create({ email: 'ada@example.com', password: 'password123' })
    await assert.rejects(
      () => Task.create({ title: 'Revisar pagos', assigneeId: user.id, status: 'unknown' }),
      /CHECK constraint failed/
    )
    assert.lengthOf(await Task.all(), 0)
  })
})
