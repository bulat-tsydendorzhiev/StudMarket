import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, ApiError } from '../api/client'
import { useAuth, type CurrentUser } from '../auth/AuthContext'

interface FieldErrors {
  username_or_email?: string
  password?: string
  [key: string]: string | undefined
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function extractFieldErrors(detail: unknown): FieldErrors {
  if (Array.isArray(detail)) {
    const errors: FieldErrors = {}
    for (const item of detail) {
      if (item && typeof item === 'object' && 'loc' in item && 'msg' in item) {
        const loc = (item as { loc: unknown[] }).loc as unknown[]
        const field = String(loc[loc.length - 1])
        errors[field] = String((item as { msg: unknown }).msg)
      }
    }
    return errors
  }
  return {}
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { authenticate } = useAuth()

  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFieldErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      const user = await apiClient.post<CurrentUser>('/auth/login', {
        username_or_email: usernameOrEmail,
        password,
      })
      authenticate(user)
      navigate('/')
    } catch (error) {
      if (error instanceof ApiError) {
        try {
          const body = JSON.parse(error.message) as { detail?: unknown }
          const errors = extractFieldErrors(body.detail)
          if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
          } else if (body.detail && typeof body.detail === 'string') {
            setFormError(body.detail)
          } else {
            setFormError('Неверное имя пользователя или пароль')
          }
        } catch {
          setFormError('Не удалось войти')
        }
      } else {
        setFormError('Не удалось войти')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link className="auth-logo" to="/">
          StudMarket
        </Link>
      </header>

      <main className="auth-main">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h1 className="auth-title">Вход</h1>

          <label className="auth-field">
            <span>Имя пользователя или email</span>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              autoComplete="username"
            />
            {fieldErrors.username_or_email && (
              <span className="auth-error">{fieldErrors.username_or_email}</span>
            )}
          </label>

          <label className="auth-field">
            <span>Пароль</span>
            <span className="auth-field__input-wrap">
              <input
                className="auth-field--password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-field__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </span>
            {fieldErrors.password && (
              <span className="auth-error">{fieldErrors.password}</span>
            )}
          </label>

          {formError && <p className="auth-form-error">{formError}</p>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Вход…' : 'Войти'}
          </button>

          <p className="auth-switch">
            Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
          </p>
        </form>
      </main>
    </div>
  )
}