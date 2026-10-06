import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import type { ApiClient } from '@japa/api-client'

/**
 * Cubre los tres scenarios de «Lo que cada tarea muestra de su responsable»
 * de `openspec/specs/tasks/spec.md`: responsable identificable, ausencia de
 * datos de cuenta y responsable sin nombre, tanto en la lista como en detalle.
 * La representación visual de «Sin nombre» corresponde a la interfaz.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function crearTarea(client: ApiClient, fullName: string | null) {
    const registro = await client.post('/api/v1/auth/signup').json({
      fullName,
      email: 'ada-tareas@example.com',
      password: 'secreto123',
      passwordConfirmation: 'secreto123',
    })
    registro.assertStatus(200)

    const { token } = registro.body().data
    const creacion = await client
      .post('/api/v1/tasks')
      .header('Authorization', `Bearer ${token}`)
      .json({ title: 'Revisar el informe' })
    creacion.assertStatus(201)

    const tarea = creacion.body().data
    if (Array.isArray(tarea)) {
      throw new Error('La creación debe devolver una tarea, no una lista')
    }

    return { token: token as string, taskId: tarea.id }
  }

  async function consultarResponsables(client: ApiClient, token: string, taskId: number) {
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)
    lista.assertStatus(200)

    const tareas = lista.body().data
    if (!Array.isArray(tareas)) {
      throw new Error('El listado debe devolver una lista de tareas')
    }
    const tarea = tareas.find((item) => item.id === taskId)
    // Además de inspeccionar el responsable, la tarea creada debe estar en la lista.
    lista.assertBodyContains({ data: [{ id: taskId }] })
    if (!tarea?.assignee) {
      throw new Error('La tarea de la lista debe incluir su responsable')
    }

    const detalle = await client
      .get(`/api/v1/tasks/${taskId}`)
      .qs({ today: '2026-10-06' })
      .header('Authorization', `Bearer ${token}`)
    detalle.assertStatus(200)
    detalle.assertBodyContains({ data: { id: taskId } })

    return { lista: tarea.assignee, detalle: detalle.body().data.assignee }
  }

  test('responsable identificable', async ({ client, assert }) => {
    const { token, taskId } = await crearTarea(client, 'Ada Lovelace')
    const responsables = await consultarResponsables(client, token, taskId)

    for (const [origen, assignee] of Object.entries(responsables)) {
      assert.equal(assignee.fullName, 'Ada Lovelace', `${origen}: nombre del responsable`)
      assert.equal(assignee.initials, 'AL', `${origen}: iniciales del responsable`)
    }
  })

  test('la tarea no filtra datos de cuenta', async ({ client, assert }) => {
    const { taskId } = await crearTarea(client, 'Ada Lovelace')
    const otraCuenta = await User.create({
      fullName: 'Alan Turing',
      email: 'alan-tareas@example.com',
      password: 'otro-secreto123',
    })
    const acceso = await User.accessTokens.create(otraCuenta)
    // La privacidad también se exige cuando otra cuenta consulta la tarea.
    const responsables = await consultarResponsables(client, acceso.value!.release(), taskId)

    // Una lista cerrada de campos detecta email, credenciales y cualquier otro
    // dato adicional, tanto en la lista como en la tarea suelta. Se admite el
    // id contemplado por el contrato TaskAssignee de este proyecto.
    const campos = Object.fromEntries(
      Object.entries(responsables).map(([origen, assignee]) => [
        origen,
        Object.keys(assignee).sort(),
      ])
    )
    assert.deepEqual(campos, {
      lista: ['fullName', 'id', 'initials'],
      detalle: ['fullName', 'id', 'initials'],
    })
  })

  test('responsable sin nombre', async ({ client, assert }) => {
    const { token, taskId } = await crearTarea(client, null)
    const responsables = await consultarResponsables(client, token, taskId)

    for (const [origen, assignee] of Object.entries(responsables)) {
      assert.isNull(assignee.fullName, `${origen}: el nombre sigue siendo nulo`)
      assert.equal(assignee.initials, 'AE', `${origen}: conserva las iniciales sin nombre`)
    }
  })
})
