import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { ApiError, createTask, getTasks } from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Algo ha ido mal. Inténtalo de nuevo.'

function newestFirst(a: Task, b: Task) {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id
}

export function TasksPage() {
  const { token } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadStatus, setLoadStatus] = useState<'loading' | 'error' | 'ready'>(
    'loading',
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const submitting = useRef(false)
  const session = useRef({ generation: 0 })
  const titleInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const sessionState = session.current
    const currentSession = ++sessionState.generation
    let cancelled = false
    if (!token) return

    getTasks(token)
      .then((result) => {
        if (cancelled || sessionState.generation !== currentSession) return
        setTasks(result.toSorted(newestFirst))
        setLoadStatus('ready')
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (cancelled || sessionState.generation !== currentSession) return
        setLoadError(errorMessage(error))
        setLoadStatus('error')
      })

    return () => {
      cancelled = true
      sessionState.generation++
    }
  }, [token, attempt])

  const retry = () => {
    setLoadStatus('loading')
    setLoadError(null)
    setAttempt((value) => value + 1)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!token || loadStatus !== 'ready' || submitting.current) return

    const currentSession = session.current.generation
    submitting.current = true
    setSubmitting(true)
    setTitleError(null)
    setFormError(null)
    try {
      const task = await createTask(token, { title })
      if (session.current.generation !== currentSession) return
      setTasks((previous) =>
        [task, ...previous.filter((item) => item.id !== task.id)].toSorted(
          newestFirst,
        ),
      )
      setTitle('')
    } catch (error) {
      if (session.current.generation !== currentSession) return
      if (error instanceof ApiError && error.fieldErrors.title) {
        setTitleError(error.fieldErrors.title)
      } else {
        setFormError(errorMessage(error))
      }
    } finally {
      if (session.current.generation === currentSession) {
        submitting.current = false
        setSubmitting(false)
      }
    }
  }

  const canCreate = loadStatus === 'ready' && !isSubmitting

  return (
    <main className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto grid max-w-3xl gap-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Tareas del equipo</h1>
          <Link to="/profile" className="text-sm font-medium underline">
            Mi perfil
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Crear una tarea</CardTitle>
            <CardDescription>
              Escribe un título para compartir el trabajo con el equipo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
              {formError && (
                <Alert variant="destructive" role="alert">
                  <AlertCircleIcon />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  ref={titleInput}
                  id="title"
                  name="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  disabled={!canCreate}
                  aria-invalid={Boolean(titleError)}
                  aria-describedby={titleError ? 'title-error' : 'title-hint'}
                />
                {titleError ? (
                  <FieldError id="title-error" message={titleError} />
                ) : (
                  <p id="title-hint" className="text-muted-foreground text-sm">
                    Hasta 255 unidades de texto; algunos emojis cuentan como
                    dos.
                  </p>
                )}
              </div>
              <Button
                type="submit"
                disabled={!canCreate}
                className="justify-self-start"
              >
                {isSubmitting ? 'Creando tarea…' : 'Crear tarea'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <section aria-labelledby="task-list-heading" className="grid gap-4">
          <div>
            <h2 id="task-list-heading" className="text-lg font-semibold">
              Lista compartida
            </h2>
            <p className="text-muted-foreground text-sm">
              Aquí ves el título, responsable y estado del trabajo del equipo.
              Para ver cambios de otras personas, vuelve a entrar o recarga.
            </p>
          </div>

          {loadStatus === 'loading' && <p role="status">Cargando tareas…</p>}
          {loadStatus === 'error' && (
            <Alert variant="destructive" role="alert">
              <AlertCircleIcon />
              <AlertDescription className="grid gap-3">
                <p>{loadError}</p>
                <Button
                  variant="outline"
                  onClick={retry}
                  className="justify-self-start"
                >
                  Reintentar consulta
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {loadStatus === 'ready' && tasks.length === 0 && (
            <Card>
              <CardContent className="grid justify-items-start gap-3 pt-6">
                <p>No hay tareas para mostrar.</p>
                <p className="text-muted-foreground text-sm">
                  Comparte el trabajo creando una tarea con su título.
                </p>
                <Button
                  variant="outline"
                  onClick={() => titleInput.current?.focus()}
                >
                  Crear la primera tarea
                </Button>
              </CardContent>
            </Card>
          )}
          {loadStatus === 'ready' && tasks.length > 0 && (
            <ul className="grid gap-3" aria-label="Tareas compartidas">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm"
                >
                  <Link
                    to={`/tasks/${task.id}`}
                    className="font-medium break-words whitespace-pre-wrap underline"
                  >
                    {task.title}
                  </Link>
                  <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <span>
                      Responsable: {task.assignee.fullName ?? 'Sin nombre'}
                    </span>
                    <span className="bg-secondary text-secondary-foreground rounded-md px-2 py-1">
                      {STATUS_LABELS[task.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
