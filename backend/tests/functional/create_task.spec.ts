import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Task from '#models/task'
import User from '#models/user'

test.group('Create task', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  const invalidPayloads = [
    {},
    { title: null },
    { title: 123 },
    { title: [] },
    { title: '' },
    { title: '   ' },
    { title: '\t\n\u00a0' },
    { title: 'a'.repeat(256) },
    { title: 'a'.repeat(255) + ' ' },
    { title: 'a'.repeat(254) + '😀' },
  ]

  test('rejects invalid titles without persisting a task')
    .with(invalidPayloads)
    .run(async ({ client, assert }, payload) => {
      const user = await User.create({ email: 'ada@example.com', password: 'password123' })
      const response = await client
        .post('/api/v1/tasks' as string)
        .loginAs(user)
        .json(payload)

      response.assertStatus(422)
      const body = response.body() as unknown as { errors: { field: string }[] }
      assert.equal(body.errors[0].field, 'title')
      assert.lengthOf(await Task.all(), 0)
    })

  test('preserves valid titles, including spaces and Unicode')
    .with(['a'.repeat(255), 'a'.repeat(253) + '😀', '  Revisar pagos  ', 'e\u0301'])
    .run(async ({ client, assert }, title) => {
      const user = await User.create({
        fullName: 'Ada',
        email: 'ada@example.com',
        password: 'password123',
      })
      const response = await client.visit('tasks.store').loginAs(user).json({ title })

      response.assertStatus(201)
      const task = response.body().data
      assert.deepEqual(Object.keys(task).sort(), ['assignee', 'createdAt', 'id', 'status', 'title'])
      assert.deepEqual(task.assignee, { fullName: 'Ada' })
      assert.equal(task.title, title)
      assert.equal(task.status, 'pending')
      assert.isTrue(Number.isFinite(Date.parse(task.createdAt!)))
      const saved = await Task.findOrFail(task.id)
      assert.equal(saved.title, title)
      assert.equal(saved.assigneeId, user.id)
    })

  test('assigns each new task to its authenticated creator, including unnamed users', async ({
    client,
    assert,
  }) => {
    const users = await User.createMany([
      { fullName: 'Ada', email: 'ada@example.com', password: 'password123' },
      { fullName: null, email: 'other@example.com', password: 'password123' },
    ])
    for (const user of users) {
      const response = await client.visit('tasks.store').loginAs(user).json({ title: 'Una tarea' })
      response.assertStatus(201)
      assert.deepEqual(response.body().data.assignee, { fullName: user.fullName })
      const saved = await Task.findOrFail(response.body().data.id)
      assert.equal(saved.assigneeId, user.id)
    }
  })

  test('ignores additional fields instead of changing server defaults', async ({
    client,
    assert,
  }) => {
    const user = await User.create({ email: 'ada@example.com', password: 'password123' })
    const response = await client
      .post('/api/v1/tasks' as string)
      .loginAs(user)
      .json({
        title: 'Revisar pagos',
        assigneeId: 999,
        assignee: { fullName: 'Otra persona' },
        status: 'done',
        dueDate: '2026-10-01',
        unexpected: true,
      })
    response.assertStatus(201)
    const body = response.body() as { data: { id: number; assignee: { fullName: null } } }
    const saved = await Task.findOrFail(body.data.id)
    assert.equal(saved.assigneeId, user.id)
    assert.equal(saved.status, 'pending')
    assert.deepEqual(body.data.assignee, { fullName: null })
  })

  test('rejects missing or invalid authentication')
    .with([null, 'invalid-token'])
    .run(async ({ client, assert }, token) => {
      const request = client.post('/api/v1/tasks').json({ title: 'Revisar pagos' })
      if (token) request.header('Authorization', `Bearer ${token}`)
      const response = await request
      response.assertStatus(401)
      assert.lengthOf(await Task.all(), 0)
    })
})
