import { useEffect, useRef, useState } from 'react'
import { Link, useBlocker, useParams } from 'react-router'
import { useAuth } from '@/auth/use-auth'
import { ApiError, getTask, updateTaskDueDate } from '@/lib/api'
import type { TaskDetail, TaskStatus } from '@/lib/types'
import { isTaskOverdue } from '@/lib/task-calendar'
import { useLocalDay } from '@/lib/use-local-day'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/field-error'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}
const message = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Algo ha ido mal. Inténtalo de nuevo.'

export function TaskDetailPage() {
  const { id = '' } = useParams()
  const { token } = useAuth()
  return token ? (
    <TaskDetailEditor key={`${id}:${token}`} id={id} token={token} />
  ) : null
}

function TaskDetailEditor({ id, token }: { id: string; token: string }) {
  const { logout } = useAuth()
  const [snapshot, setSnapshot] = useState<TaskDetail | null>(null)
  const [draft, setDraft] = useState('')
  const [invalidInput, setInvalidInput] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [conflict, setConflict] = useState(false)
  const [missing, setMissing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const lifecycle = useRef({
    generation: 0,
    saving: false,
    loading: false,
    hasSnapshot: false,
  })
  const today = useLocalDay()
  const dirty =
    snapshot !== null && (invalidInput || draft !== (snapshot.dueDate ?? ''))
  const blocker = useBlocker(saving || dirty)

  useEffect(() => {
    const state = lifecycle.current
    const generation = ++state.generation
    const controller = new AbortController()
    state.loading = true
    getTask(token, id, controller.signal)
      .then((task) => {
        if (state.generation !== generation) return
        setSnapshot(task)
        // A conflict consultation replaces only the snapshot, never the draft.
        if (!state.hasSnapshot) setDraft(task.dueDate ?? '')
        state.hasSnapshot = true
        setConflict(false)
        setMissing(false)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (state.generation !== generation) return
        setError(message(cause))
        if (cause instanceof ApiError && cause.status === 404) setMissing(true)
        if (cause instanceof ApiError && cause.status === 401) void logout()
      })
      .finally(() => {
        if (state.generation !== generation) return
        state.loading = false
        setLoading(false)
      })
    return () => {
      state.generation++
      controller.abort()
    }
  }, [id, token, attempt, logout])

  useEffect(() => {
    if (!dirty && !saving) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, saving])

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (saving) {
      setNotice('Espera a que termine el guardado antes de salir.')
      blocker.reset()
      return
    }
    if (!dirty) {
      blocker.reset()
      return
    }
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [blocker, dirty, saving])

  const consult = () => {
    if (lifecycle.current.saving || lifecycle.current.loading) return
    setLoading(true)
    setError(null)
    setNotice(null)
    setAttempt((value) => value + 1)
  }

  const discard = () => {
    if (lifecycle.current.saving || loading || !snapshot) return
    if (input.current) input.current.value = snapshot.dueDate ?? ''
    setDraft(snapshot.dueDate ?? '')
    setInvalidInput(false)
    setFieldError(null)
    setNotice(null)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const state = lifecycle.current
    if (
      !snapshot ||
      state.saving ||
      state.loading ||
      conflict ||
      missing ||
      !dirty
    )
      return
    if (invalidInput || (input.current && !input.current.validity.valid)) {
      setFieldError('Introduce un día de calendario válido (años 0001–9999).')
      return
    }
    const generation = state.generation
    state.saving = true
    setSaving(true)
    setError(null)
    setFieldError(null)
    setNotice(null)
    try {
      const task = await updateTaskDueDate(token, id, {
        dueDate: draft === '' ? null : draft,
        expectedDueDate: snapshot.dueDate,
        expectedStatus: snapshot.status,
      })
      if (state.generation !== generation) return
      setSnapshot(task)
      setDraft(task.dueDate ?? '')
      setInvalidInput(false)
      setNotice('Fecha guardada.')
    } catch (cause: unknown) {
      if (state.generation !== generation) return
      if (cause instanceof ApiError && cause.fieldErrors.dueDate)
        setFieldError(cause.fieldErrors.dueDate)
      else setError(message(cause))
      if (cause instanceof ApiError && cause.status === 409) setConflict(true)
      if (cause instanceof ApiError && cause.status === 404) setMissing(true)
      if (cause instanceof ApiError && cause.status === 401) void logout()
    } finally {
      if (state.generation === generation) {
        state.saving = false
        setSaving(false)
      }
    }
  }

  const edit = (element: HTMLInputElement) => {
    setDraft(element.value)
    setInvalidInput(element.validity.badInput)
    setFieldError(null)
    setNotice(null)
  }

  return (
    <main className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto grid max-w-3xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Detalle de tarea</h1>
          {saving ? (
            <Button disabled variant="outline">
              Volver a tareas
            </Button>
          ) : (
            <Link to="/tasks" className="text-sm font-medium underline">
              Volver a tareas
            </Link>
          )}
        </header>
        {loading && <p role="status">Consultando tarea…</p>}
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {!snapshot && !loading && !missing && (
          <Button onClick={consult} className="justify-self-start">
            Reintentar consulta
          </Button>
        )}
        {notice && <p role="status">{notice}</p>}
        {snapshot && (
          <Card>
            <CardHeader>
              <CardTitle className="break-words whitespace-pre-wrap">
                {snapshot.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <dl className="grid gap-2">
                <div>
                  <dt className="font-medium">Responsable</dt>
                  <dd>{snapshot.assignee.fullName ?? 'Sin nombre'}</dd>
                </div>
                <div>
                  <dt className="font-medium">Estado</dt>
                  <dd>{STATUS_LABELS[snapshot.status]}</dd>
                </div>
                <div>
                  <dt className="font-medium">Fecha guardada</dt>
                  <dd>{snapshot.dueDate ?? 'Sin fecha'}</dd>
                </div>
              </dl>
              {isTaskOverdue(snapshot.dueDate, snapshot.status, today) && (
                <p className="text-destructive font-semibold">Vencida</p>
              )}
              <form onSubmit={save} className="grid gap-4" noValidate>
                <div className="grid gap-2">
                  <Label htmlFor="due-date">Fecha de vencimiento</Label>
                  <Input
                    ref={input}
                    id="due-date"
                    type="date"
                    min="0001-01-01"
                    max="9999-12-31"
                    value={draft}
                    onChange={(event) => edit(event.currentTarget)}
                    onInput={(event) => edit(event.currentTarget)}
                    disabled={saving || loading || missing}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={fieldError ? 'date-error' : 'date-hint'}
                  />
                  {fieldError ? (
                    <FieldError id="date-error" message={fieldError} />
                  ) : (
                    <p id="date-hint" className="text-muted-foreground text-sm">
                      Opcional. Los cambios se aplican al guardar.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    disabled={
                      saving || loading || missing || conflict || !dirty
                    }
                  >
                    {saving ? 'Guardando…' : 'Guardar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || loading || missing}
                    onClick={() => {
                      if (input.current) input.current.value = ''
                      setDraft('')
                      setInvalidInput(false)
                      setFieldError(null)
                      setNotice(null)
                    }}
                  >
                    Quitar fecha
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving || loading || !dirty}
                    onClick={discard}
                  >
                    Descartar edición
                  </Button>
                </div>
              </form>
              {conflict && (
                <Button
                  variant="outline"
                  onClick={consult}
                  disabled={saving || loading}
                  className="justify-self-start"
                >
                  Consultar cambios
                </Button>
              )}
              {!conflict && error && !missing && (
                <Button
                  variant="outline"
                  onClick={consult}
                  disabled={saving || loading}
                  className="justify-self-start"
                >
                  Reintentar consulta
                </Button>
              )}
            </CardContent>
          </Card>
        )}
        <dialog
          ref={dialog}
          aria-labelledby="discard-heading"
          aria-describedby="discard-description"
          className="bg-card text-card-foreground fixed inset-0 m-auto max-w-md rounded-xl border p-6 shadow-xl backdrop:bg-black/40"
          onCancel={(event) => {
            event.preventDefault()
            if (blocker.state === 'blocked') blocker.reset()
          }}
        >
          <h2 id="discard-heading" className="text-lg font-semibold">
            ¿Descartar los cambios?
          </h2>
          <p id="discard-description" className="my-4">
            La fecha editada no se ha guardado. Puedes permanecer o salir sin
            guardar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              autoFocus
              onClick={() => {
                if (blocker.state === 'blocked') blocker.reset()
              }}
            >
              Permanecer
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (blocker.state === 'blocked') blocker.proceed()
              }}
            >
              Salir sin guardar
            </Button>
          </div>
        </dialog>
      </div>
    </main>
  )
}
