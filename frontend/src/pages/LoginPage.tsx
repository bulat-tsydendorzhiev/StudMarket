import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, ApiError } from '../api/client'

interface FieldErrors {
  username_or_email?: string
  password?: string
  [key: string]: string | undefined
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

  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFieldErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      await apiClient.post('/auth/login', {
        username_or_email: usernameOrEmail,
        password,
      })
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
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