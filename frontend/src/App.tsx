import { useState, type FormEvent } from 'react'
import './App.css'

type AuthenticatedUser = {
  fullName: string | null
  email: string
}

type LoginResponse = {
  data: {
    user: AuthenticatedUser
    token: string
  }
}

type AuthenticatedSession = LoginResponse['data']

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3333').replace(/\/$/, '')
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState<AuthenticatedSession | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const normalizedEmail = email.trim()
  const isEmailValid = EMAIL_PATTERN.test(normalizedEmail)
  const canSubmit = isEmailValid && password.length > 0 && !isSubmitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) return

    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      })

      if (!response.ok) throw new Error('Login failed')

      const { data } = (await response.json()) as LoginResponse
      setSession(data)
      setPassword('')
    } catch {
      setError('No hemos podido iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    if (!session || isLoggingOut) return

    setLogoutError('')
    setIsLoggingOut(true)

    try {
      const response = await fetch(`${API_URL}/api/v1/account/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      })

      if (!response.ok) throw new Error('Logout failed')

      setSession(null)
    } catch {
      setLogoutError('No hemos podido cerrar la sesión. Inténtalo de nuevo.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (session) {
    const displayName = session.user.fullName?.trim() || session.user.email

    return (
      <main className="app-shell">
        <section className="welcome-card" aria-labelledby="welcome-title">
          <div className="success-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m7.5 12.5 3 3 6-7" />
            </svg>
          </div>
          <p className="eyebrow">Sesión iniciada (con harness)</p>
          <h1 id="welcome-title">¡Bienvenido, {displayName}!</h1>
          <p className="welcome-copy">Ya puedes empezar a organizar el trabajo de tu equipo.</p>

          <div className="logout-actions">
            {logoutError && (
              <div className="auth-error" role="alert">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5M12 16.5h.01" />
                </svg>
                <span>{logoutError}</span>
              </div>
            )}

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-busy={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Cerrando sesión...
                </>
              ) : (
                'Cerrar sesión'
              )}
            </button>
          </div>
        </section>
      </main>
    )
  }

  const showEmailError = emailTouched && email.length > 0 && !isEmailValid

  return (
    <main className="app-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="brand" aria-label="FlowSync">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span>FlowSync</span>
        </div>

        <div className="login-heading">
          <p className="eyebrow">Te damos la bienvenida</p>
          <h1 id="login-title">Inicia sesión</h1>
          <p>Accede a tu espacio de trabajo y mantén a tu equipo sincronizado.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
              onBlur={() => setEmailTouched(true)}
              autoComplete="email"
              placeholder="nombre@empresa.com"
              required
              disabled={isSubmitting}
              aria-invalid={showEmailError}
              aria-describedby={showEmailError ? 'email-error' : undefined}
            />
            {showEmailError && (
              <span className="field-error" id="email-error">
                Introduce un correo electrónico válido.
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              autoComplete="current-password"
              placeholder="Introduce tu contraseña"
              required
              disabled={isSubmitting}
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7.5v5M12 16.5h.01" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={!canSubmit} aria-busy={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Comprobando usuario...
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>
      </section>

      <p className="footer-copy">Organiza. Colabora. Avanza.</p>
    </main>
  )
}

export default App
