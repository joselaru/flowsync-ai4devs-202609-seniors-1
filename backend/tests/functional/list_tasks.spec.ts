import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Task from '#models/task'
import User from '#models/user'

test.group('Shared task list', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('returns the same active tasks to both users in stable creation order without mutations', async ({
    client,
    assert,
  }) => {
    const [ada, unnamed] = await User.createMany([
      { fullName: 'Ada', email: 'ada@example.com', password: 'password123' },
      { fullName: null, email: 'unnamed@example.com', password: 'password123' },
    ])
    const oldDate = DateTime.fromISO('2026-01-01T10:00:00Z')
    const newDate = oldDate.plus({ days: 1 })
    const tasks = await Task.createMany([
      { title: 'Antigua', assigneeId: ada.id, status: 'pending', createdAt: oldDate },
      { title: 'En curso', assigneeId: unnamed.id, status: 'in_progress', createdAt: newDate },
      { title: 'Empate más reciente', assigneeId: ada.id, status: 'pending', createdAt: newDate },
      {
        title: 'Terminada',
        assigneeId: unnamed.id,
        status: 'done',
        createdAt: newDate.plus({ days: 1 }),
      },
    ])
    const persisted = await Task.query().orderBy('id')
    const before = persisted.map((task) => task.serialize())

    const responseA = await client.visit('tasks.index').loginAs(ada)
    const responseB = await client.visit('tasks.index').loginAs(unnamed)
    responseA.assertStatus(200)
    responseB.assertStatus(200)
    assert.deepEqual(responseA.body(), responseB.body())
    const data = responseA.body().data
    assert.deepEqual(
      data.map((task) => task.id),
      [tasks[2].id, tasks[1].id, tasks[0].id]
    )
    assert.deepEqual(
      data.map((task) => task.status),
      ['pending', 'in_progress', 'pending']
    )
    assert.deepEqual(data[1].assignee, { fullName: null })
    for (const task of data) {
      assert.deepEqual(Object.keys(task).sort(), ['assignee', 'createdAt', 'id', 'status', 'title'])
      assert.deepEqual(Object.keys(task.assignee), ['fullName'])
    }
    const after = await Task.query().orderBy('id')
    assert.deepEqual(
      after.map((task) => task.serialize()),
      before
    )
  })

  test('returns an empty array for an empty space', async ({ client }) => {
    const user = await User.create({ email: 'ada@example.com', password: 'password123' })
    const response = await client.visit('tasks.index').loginAs(user)
    response.assertStatus(200)
    response.assertBody({ data: [] })
  })

  test('another user can read a task created through the API', async ({ client, assert }) => {
    const [creator, reader] = await User.createMany([
      { fullName: 'Ada', email: 'ada@example.com', password: 'password123' },
      { fullName: 'Grace', email: 'grace@example.com', password: 'password123' },
    ])
    const created = await client.visit('tasks.store').loginAs(creator).json({ title: 'Compartida' })
    created.assertStatus(201)
    const response = await client.visit('tasks.index').loginAs(reader)
    response.assertStatus(200)
    assert.deepEqual(response.body().data, [created.body().data])
  })

  test('rejects missing or invalid authentication')
    .with([null, 'invalid-token'])
    .run(async ({ client }, token) => {
      const request = client.get('/api/v1/tasks')
      if (token) request.header('Authorization', `Bearer ${token}`)
      const response = await request
      response.assertStatus(401)
    })

  test('does not expose generic mutation or deletion endpoints', async ({ client }) => {
    const user = await User.create({ email: 'ada@example.com', password: 'password123' })
    const task = await Task.create({ title: 'Una tarea', assigneeId: user.id, status: 'pending' })
    for (const method of ['PATCH', 'DELETE'] as const) {
      const response = await client.request(`/api/v1/tasks/${task.id}`, method).loginAs(user)
      response.assertStatus(404)
    }
  })
})
