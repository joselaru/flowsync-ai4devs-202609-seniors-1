import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import Task from '#models/task'
import User from '#models/user'
import DueDateMigration from '#database/migrations/1791045000000_add_task_due_date'

test.group('Task date persistence', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('migration preserves old rows and rolls back only the new column', async ({ assert }) => {
    db.manager.add('dateMigrationTest', {
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    })
    const isolated = db.connection('dateMigrationTest')
    try {
      await isolated.schema.createTable('tasks', (table) => {
        table.increments('id')
        table.text('title')
        table.integer('assignee_id')
        table.text('status')
        table.text('created_at')
        table.text('updated_at')
      })
      const original = {
        id: 1,
        title: '  Anterior  ',
        assignee_id: 9,
        status: 'done',
        created_at: '2026-01-01',
        updated_at: null,
      }
      await isolated.table('tasks').insert(original)
      await new DueDateMigration(isolated, 'task_due_date').execUp()
      assert.deepEqual(await isolated.from('tasks').first(), { ...original, due_date: null })
      await isolated.from('tasks').update({ due_date: '2026-01-02' })
      await new DueDateMigration(isolated, 'task_due_date').execDown()
      assert.deepEqual(await isolated.from('tasks').first(), original)
    } finally {
      await db.manager.close('dateMigrationTest')
    }
  })

  test('date and null persist without being changed by state or assignee fixtures', async ({
    assert,
  }) => {
    const [a, b] = await User.createMany([
      { email: 'date-a@example.com', password: 'password123' },
      { email: 'date-b@example.com', password: 'password123' },
    ])
    const task = await Task.create({ title: 'Fecha', status: 'pending', assigneeId: a.id })
    await task.refresh()
    assert.isNull(task.dueDate)
    task.dueDate = '0001-01-01'
    await task.save()
    task.status = 'done'
    task.assigneeId = b.id
    await task.save()
    await task.refresh()
    assert.equal(task.dueDate, '0001-01-01')
    task.dueDate = null
    await task.save()
    await task.refresh()
    assert.isNull(task.dueDate)
  })
})
