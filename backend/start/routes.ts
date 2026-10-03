/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

router.get('/', () => {
  return { hello: 'world' }
})

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())

    router.post('tasks', [controllers.Tasks, 'store']).as('tasks.store').use(middleware.auth())
    router.get('tasks', [controllers.Tasks, 'index']).as('tasks.index').use(middleware.auth())
    router.get('tasks/:id', [controllers.Tasks, 'show']).as('tasks.show').use(middleware.auth())
    router
      .patch('tasks/:id/due-date', [controllers.Tasks, 'updateDueDate'])
      .as('tasks.updateDueDate')
      .use(middleware.auth())
  })
  .prefix('/api/v1')
