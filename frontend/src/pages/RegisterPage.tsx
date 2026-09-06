import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, ApiError } from '../api/client'
import { useAuth, type CurrentUser } from '../auth/AuthContext'

interface FieldErrors {
  username?: string
  email?: string
  password?: string
  password_confirmation?: string
  [key: string]: string | undefined
}

const MIN_PASSWORD_LENGTH = 8

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

function GradCapIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    </svg>
  )
}

function passwordStrengthErrors(password: string): string[] {
  const errors: string[] = []
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`минимум ${MIN_PASSWORD_LENGTH} символов`)
  }
  if (!/[A-Z]/.test(password)) errors.push('заглавная буква')
  if (!/[a-z]/.test(password)) errors.push('строчная буква')
  if (!/\d/.test(password)) errors.push('цифра')
  return errors
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
  const { authenticate } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const passwordStrengthErrorsList = passwordStrengthErrors(password)
  const passwordIsValid = passwordStrengthErrorsList.length === 0

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFieldErrors({})
    setFormError('')

    if (password !== passwordConfirmation) {
      setFieldErrors({ password_confirmation: 'Пароли не совпадают' })
      return
    }

    if (passwordStrengthErrorsList.length > 0) {
      setFieldErrors({ password: 'Пароль слишком слабый' })
      return
    }

    setSubmitting(true)
    try {
      const user = await apiClient.post<CurrentUser>('/auth/register', {
        username,
        email,
        password,
        password_confirmation: passwordConfirmation,
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
          <span className="logo-mark" aria-hidden="true" />
          Stud<span style={{ color: 'var(--green)' }}>Market</span>
        </Link>
      </header>

      <main className="auth-main">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-icon">
            <GradCapIcon />
          </div>
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
            <span className="auth-field__input-wrap">
              <input
                className="auth-field--password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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
            {password.length > 0 && (
              <span className="auth-password-hints">
                {passwordStrengthErrorsList.map((hint) => (
                  <span key={hint} className="auth-password-hint">
                    {hint}
                  </span>
                ))}
                {passwordIsValid && (
                  <span className="auth-password-hint auth-password-hint--valid">
                    Пароль достаточно надёжный
                  </span>
                )}
              </span>
            )}
          </label>

          <label className="auth-field">
            <span>Подтверждение пароля</span>
            <span className="auth-field__input-wrap">
              <input
                className="auth-field--password"
                type={showPasswordConfirmation ? 'text' : 'password'}
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-field__toggle"
                onClick={() => setShowPasswordConfirmation((v) => !v)}
                aria-label={
                  showPasswordConfirmation ? 'Скрыть подтверждение пароля' : 'Показать подтверждение пароля'
                }
              >
                {showPasswordConfirmation ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </span>
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
