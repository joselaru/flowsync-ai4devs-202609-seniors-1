import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import User from '#models/user'

test.group('Database isolation', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('writes use the test database, not development', async ({ assert }) => {
    const databases = await db.rawQuery('PRAGMA database_list')
    const main = databases.find((database: { name: string }) => database.name === 'main')
    assert.equal(main.file, app.tmpPath('db.test.sqlite3'))
    assert.notEqual(main.file, app.tmpPath('db.sqlite3'))

    const user = await User.create({ email: 'isolation@example.com', password: 'password123' })
    const saved = await User.findOrFail(user.id)
    assert.equal(saved.email, 'isolation@example.com')
  })
})
