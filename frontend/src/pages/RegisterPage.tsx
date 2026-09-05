import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, ApiError } from '../api/client'

interface FieldErrors {
  username?: string
  email?: string
  password?: string
  password_confirmation?: string
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

export default function RegisterPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFieldErrors({})
    setFormError('')

    if (password !== passwordConfirmation) {
      setFieldErrors({ password_confirmation: 'Пароли не совпадают' })
      return
    }

    setSubmitting(true)
    try {
      await apiClient.post('/auth/register', {
        username,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })
      navigate('/login')
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
            setFormError('Не удалось создать аккаунт')
          }
        } catch {
          setFormError('Не удалось создать аккаунт')
        }
      } else {
        setFormError('Не удалось создать аккаунт')
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
          <h1 className="auth-title">Регистрация</h1>

          <label className="auth-field">
            <span>Имя пользователя</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            {fieldErrors.username && (
              <span className="auth-error">{fieldErrors.username}</span>
            )}
          </label>

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email && <span className="auth-error">{fieldErrors.email}</span>}
          </label>

          <label className="auth-field">
            <span>Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <span className="auth-error">{fieldErrors.password}</span>
            )}
          </label>

          <label className="auth-field">
            <span>Подтверждение пароля</span>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              autoComplete="new-password"
            />
            {fieldErrors.password_confirmation && (
              <span className="auth-error">{fieldErrors.password_confirmation}</span>
            )}
          </label>

          {formError && <p className="auth-form-error">{formError}</p>}

          <button className="auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Регистрация…' : 'Создать аккаунт'}
          </button>

          <p className="auth-switch">
            Уже есть аккаунт? <Link to="/login">Войти</Link>
          </p>
        </form>
      </main>
    </div>
  )
}