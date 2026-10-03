import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

test.group('Auth compatibility', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  test('signup and login retain original parsing and profile/logout contracts', async ({
    client,
    assert,
  }) => {
    const signup = await client.post('/api/v1/auth/signup').json({
      fullName: '  Ada  ',
      email: '  ada@example.com  ',
      password: 'password123',
      passwordConfirmation: 'password123',
    })
    signup.assertStatus(200)
    assert.equal(signup.body().data.user.fullName, 'Ada')
    assert.equal(signup.body().data.user.email, 'ada@example.com')

    const login = await client.post('/api/v1/auth/login').json({
      email: '  ada@example.com  ',
      password: 'password123',
    })
    login.assertStatus(200)
    const token = login.body().data.token
    const profile = await client
      .get('/api/v1/account/profile')
      .header('Authorization', `Bearer ${token}`)
    profile.assertStatus(200)
    assert.equal(profile.body().data.email, 'ada@example.com')

    const logout = await client
      .post('/api/v1/account/logout')
      .header('Authorization', `Bearer ${token}`)
    logout.assertStatus(200)
    const rejected = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)
    rejected.assertStatus(401)
  })
})
