import { test } from '@japa/runner'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { setTimeout as delay } from 'node:timers/promises'
import env from '#start/env'
import Task from '#models/task'
import User from '#models/user'

test('two independent HTTP processes race on one reference with exactly 200/409', async ({
  assert,
}) => {
  // No global transaction: both processes must see committed fixtures.
  const user = await User.create({ email: 'date-race@example.com', password: 'password123' })
  const task = await Task.create({ title: 'Race fixture', assigneeId: user.id, status: 'pending' })
  const token = await User.accessTokens.create(user)
  const socket = createServer()
  socket.listen(0, '127.0.0.1')
  await once(socket, 'listening')
  const address = socket.address()
  if (!address || typeof address === 'string') throw new Error('Missing ephemeral port')
  const port = address.port
  await new Promise<void>((resolve) => socket.close(() => resolve()))
  const child = spawn(process.execPath, ['--import=@poppinss/ts-exec', 'bin/server.ts'], {
    env: { ...process.env, NODE_ENV: 'test', PORT: String(port), HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (data) => {
    output += data
  })
  child.stderr.on('data', (data) => {
    output += data
  })
  try {
    const other = `http://127.0.0.1:${port}`
    let ready = false
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(output)
      ready = await fetch(other)
        .then((r) => r.ok)
        .catch(() => false)
      if (ready) break
      await delay(100)
    }
    assert.isTrue(ready, output)
    const local = `http://127.0.0.1:${env.get('PORT')}`
    const headers = {
      'Authorization': `Bearer ${token.value!.release()}`,
      'Content-Type': 'application/json',
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      task.dueDate = null
      await task.save()
      const responses = await Promise.all(
        [local, other].map((origin, i) =>
          fetch(`${origin}/api/v1/tasks/${task.id}/due-date`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              dueDate: `2026-01-0${i + 1}`,
              expectedDueDate: null,
              expectedStatus: 'pending',
            }),
          })
        )
      )
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409])
      const winner = responses.findIndex((r) => r.status === 200)
      await task.refresh()
      assert.equal(task.dueDate, `2026-01-0${winner + 1}`)
    }
  } finally {
    const exited = child.exitCode === null ? once(child, 'exit') : Promise.resolve()
    child.kill('SIGTERM')
    await exited
    await task.delete()
    await User.accessTokens.delete(user, token.identifier)
    await user.delete()
  }
}).timeout(30000)
