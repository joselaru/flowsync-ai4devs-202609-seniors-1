import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import Task from '#models/task'
import User from '#models/user'

test.group('Task detail and date', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  async function fixtures() {
    const [owner, editor] = await User.createMany([
      { fullName: null, email: 'owner@example.com', password: 'password123' },
      { fullName: 'Editor', email: 'editor@example.com', password: 'password123' },
    ])
    const task = await Task.create({
      title: '  Consulta  ',
      assigneeId: owner.id,
      status: 'pending',
    })
    await task.refresh()
    return { owner, editor, task }
  }

  test('reads own and other tasks in all states, exposes only public fields and never writes', async ({
    client,
    assert,
  }) => {
    const { owner, editor, task } = await fixtures()
    for (const status of ['pending', 'in_progress', 'done']) {
      task.status = status
      await task.save()
      await task.refresh()
      const before = task.serialize()
      for (const reader of [owner, editor]) {
        const response = await client.get(`/api/v1/tasks/${task.id}`).loginAs(reader)
        response.assertStatus(200)
        const data = response.body().data
        assert.deepEqual(Object.keys(data).sort(), [
          'assignee',
          'createdAt',
          'dueDate',
          'id',
          'status',
          'title',
        ])
        assert.deepEqual(data.assignee, { fullName: null })
        assert.equal(data.status, status)
        assert.isNull(data.dueDate)
      }
      await task.refresh()
      assert.deepEqual(task.serialize(), before)
    }
  })

  test('establishes, changes and removes past dates in all states by either user, ignores extra fields', async ({
    client,
    assert,
  }) => {
    const { owner, editor, task } = await fixtures()
    for (const status of ['pending', 'in_progress', 'done']) {
      task.status = status
      await task.save()
      await task.refresh()
      for (const dueDate of ['0001-01-01', '2000-02-29', '9999-12-31', null]) {
        const before = task.serialize()
        const response = await client
          .patch(`/api/v1/tasks/${task.id}/due-date`)
          .loginAs(dueDate ? editor : owner)
          .json({
            dueDate,
            expectedDueDate: task.dueDate,
            expectedStatus: status,
            title: 'changed',
            assigneeId: editor.id,
            status: 'invalid',
            version: 100,
          })
        response.assertStatus(200)
        assert.equal(response.body().data.dueDate, dueDate)
        await task.refresh()
        assert.deepEqual(task.serialize(), { ...before, dueDate })
      }
    }
  })

  test('rejects invalid dates and reference dates without mutating')
    .with([
      '',
      '2026-02-29',
      '1900-02-29',
      '2026-04-31',
      '0000-01-01',
      '10000-01-01',
      '2026-00-01',
      '2026-01-00',
      '2026-13-01',
      '2026-1-01',
      ' 2026-01-01 ',
      '2026-01-01T00:00:00Z',
      123,
      true,
      [],
      {},
    ])
    .run(async ({ client, assert }, invalid) => {
      const { editor, task } = await fixtures()
      for (const field of ['dueDate', 'expectedDueDate']) {
        const response = await client
          .patch(`/api/v1/tasks/${task.id}/due-date`)
          .loginAs(editor)
          .json({
            dueDate: '2026-01-01',
            expectedDueDate: null,
            expectedStatus: 'pending',
            [field]: invalid,
          })
        response.assertStatus(422)
        assert.isTrue(
          response.body().errors.some((error: { field: string }) => error.field === field)
        )
        await task.refresh()
        assert.isNull(task.dueDate)
      }
    })

  test('requires every payload field including nullable reference')
    .with(['dueDate', 'expectedDueDate', 'expectedStatus'])
    .run(async ({ client, assert }, missing) => {
      const { editor, task } = await fixtures()
      const payload: Record<string, unknown> = {
        dueDate: null,
        expectedDueDate: null,
        expectedStatus: 'pending',
      }
      delete payload[missing]
      const response = await client
        .patch(`/api/v1/tasks/${task.id}/due-date`)
        .loginAs(editor)
        .json(payload)
      response.assertStatus(422)
      assert.equal(response.body().errors[0].field, missing)
    })

  test('rejects invalid reference states', async ({ client }) => {
    const { editor, task } = await fixtures()
    for (const expectedStatus of [null, '', 'Done', 'archived', 1]) {
      const response = await client
        .patch(`/api/v1/tasks/${task.id}/due-date`)
        .loginAs(editor)
        .json({ dueDate: null, expectedDueDate: null, expectedStatus })
      response.assertStatus(422)
    }
  })

  test('conflicts on changed date or state, permits a no-op and reverted values', async ({
    client,
    assert,
  }) => {
    const { editor, task } = await fixtures()
    const patch = (
      dueDate: string | null,
      expectedDueDate: string | null,
      expectedStatus = 'pending'
    ) =>
      client
        .patch(`/api/v1/tasks/${task.id}/due-date`)
        .loginAs(editor)
        .json({ dueDate, expectedDueDate, expectedStatus })
    const noop = await patch(null, null)
    noop.assertStatus(200)
    const saved = await patch('2026-01-01', null)
    saved.assertStatus(200)
    const dateConflict = await patch('2026-02-01', null)
    dateConflict.assertStatus(409)
    await task.refresh()
    assert.equal(task.dueDate, '2026-01-01')
    task.status = 'done'
    await task.save()
    const stateConflict = await patch(null, '2026-01-01')
    stateConflict.assertStatus(409)
    await task.refresh()
    assert.equal(task.dueDate, '2026-01-01')
    task.status = 'pending'
    task.dueDate = null
    await task.save()
    const reverted = await patch('2026-03-01', null)
    reverted.assertStatus(200)
  })

  test('authentication and nonexistent or malformed ids', async ({ client }) => {
    const { editor, task } = await fixtures()
    for (const token of [null, 'invalid-token']) {
      for (const method of ['GET', 'PATCH'] as const) {
        const req = client.request(
          `/api/v1/tasks/${task.id}${method === 'PATCH' ? '/due-date' : ''}`,
          method
        )
        if (token) req.header('Authorization', `Bearer ${token}`)
        const response = await req.json({
          dueDate: null,
          expectedDueDate: null,
          expectedStatus: 'pending',
        })
        response.assertStatus(401)
      }
    }
    for (const id of ['999999', 'abc', '-1', '1.5', '9007199254740992']) {
      const read = await client.get(`/api/v1/tasks/${id}`).loginAs(editor)
      read.assertStatus(404)
      const update = await client
        .patch(`/api/v1/tasks/${id}/due-date`)
        .loginAs(editor)
        .json({ dueDate: null, expectedDueDate: null, expectedStatus: 'pending' })
      update.assertStatus(404)
    }
  })

  test('creation ignores date and collection never exposes it', async ({ client, assert }) => {
    const { editor } = await fixtures()
    const response = await client
      .post('/api/v1/tasks')
      .loginAs(editor)
      .json({ title: 'Alta', dueDate: '2026-01-01' })
    response.assertStatus(201)
    const created = response.body().data
    if (Array.isArray(created)) throw new Error('Expected a single created task')
    const task = await Task.findOrFail(created.id)
    assert.isNull(task.dueDate)
    const list = await client.get('/api/v1/tasks').loginAs(editor)
    const collection = list.body().data
    if (!Array.isArray(collection)) throw new Error('Expected a task collection')
    for (const entry of collection) assert.notProperty(entry, 'dueDate')
  })
})
