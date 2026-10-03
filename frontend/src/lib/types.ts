/**
 * Espejo de `UserTransformer` del backend (app/transformers/user_transformer.ts).
 */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string
}

/**
 * Respuesta de `POST /auth/signup` y `POST /auth/login`, ya sin el envoltorio `{ data }`.
 */
export type AuthResult = {
  user: User
  token: string
}

export type SignupPayload = {
  /** El backend lo declara `.nullable()`: la clave debe viajar siempre, aunque valga `null`. */
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type TaskStatus = 'pending' | 'in_progress' | 'done'

export type Task = {
  id: number
  title: string
  status: TaskStatus
  createdAt: string
  assignee: { fullName: string | null }
}

export type CreateTaskPayload = { title: string }

export type TaskDetail = Task & { dueDate: string | null }
export type UpdateDueDatePayload = {
  dueDate: string | null
  expectedDueDate: string | null
  expectedStatus: TaskStatus
}
