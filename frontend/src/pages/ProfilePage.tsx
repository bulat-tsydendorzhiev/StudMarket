import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { profileApi, type ProfileUpdate } from '../api/auth'
import { useAuth, type CurrentUser } from '../auth/AuthContext'
import MessagesLink from '../components/MessagesLink'
import UserAvatar, {
  avatarSrc,
  AVATAR_PRESETS,
} from '../components/UserAvatar'

interface FieldErrors {
  username?: string
  email?: string
  current_password?: string
  new_password?: string
  avatar_path?: string
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

export default function ProfilePage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return <ProfileForm user={user} />
}

function ProfileForm({ user }: { user: CurrentUser }) {
  const { authenticate } = useAuth()

  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    avatarSrc(user.avatar_path),
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFieldErrors({})
    setFormError('')
    setSuccess(false)

    if (newPassword !== newPasswordConfirmation) {
      setFieldErrors({ new_password: 'Пароли не совпадают' })
      return
    }

    const payload: ProfileUpdate = {}
    if (username !== user.username) {
      payload.username = username
    }
    if (email !== user.email) {
      payload.email = email
    }
    if (newPassword) {
      payload.current_password = currentPassword
      payload.new_password = newPassword
    }
    if (selectedAvatar !== avatarSrc(user.avatar_path)) {
      payload.avatar_path = selectedAvatar
    }

    if (Object.keys(payload).length === 0) {
      return
    }

    setSubmitting(true)
    try {
      const updated = await profileApi.update(payload)
      authenticate(updated)
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirmation('')
      setSuccess(true)
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
            setFormError('Не удалось сохранить профиль')
          }
        } catch {
          setFormError('Не удалось сохранить профиль')
        }
      } else {
        setFormError('Не удалось сохранить профиль')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="profile">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          StudMarket
        </Link>
        <MessagesLink />
        <UserAvatar />
      </header>

      <main className="profile__main">
        <h1 className="profile__title">Профиль</h1>

        <div className="profile__summary">
          <img
            className="profile__avatar"
            src={avatarSrc(user.avatar_path)}
            alt="Аватар"
            width={96}
            height={96}
          />
          <div className="profile__meta">
            <span className="profile__username">{user.username}</span>
            <span className="profile__email">{user.email}</span>
          </div>
        </div>

        <form
          className="listing-form profile-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label className="listing-form__field">
            <span>Имя пользователя</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
            {fieldErrors.username && (
              <span className="listing-form__error">{fieldErrors.username}</span>
            )}
          </label>

          <label className="listing-form__field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <span className="listing-form__error">{fieldErrors.email}</span>
            )}
          </label>

          <fieldset className="listing-form__field profile-avatar-picker">
            <legend>Аватар</legend>
            <div className="profile-avatar-picker__grid">
              {AVATAR_PRESETS.map((preset) => (
                <label
                  className={
                    selectedAvatar === preset.path
                      ? 'profile-avatar-picker__option profile-avatar-picker__option--active'
                      : 'profile-avatar-picker__option'
                  }
                  key={preset.path}
                >
                  <input
                    type="radio"
                    name="avatar"
                    value={preset.path}
                    checked={selectedAvatar === preset.path}
                    onChange={() => setSelectedAvatar(preset.path)}
                  />
                  <img src={preset.path} alt={preset.name} />
                </label>
              ))}
            </div>
            {fieldErrors.avatar_path && (
              <span className="listing-form__error">
                {fieldErrors.avatar_path}
              </span>
            )}
          </fieldset>

          <fieldset className="listing-form__field profile-password">
            <legend>Смена пароля</legend>
            <label className="listing-form__field">
              <span>Текущий пароль</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              {fieldErrors.current_password && (
                <span className="listing-form__error">
                  {fieldErrors.current_password}
                </span>
              )}
            </label>
            <label className="listing-form__field">
              <span>Новый пароль</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              {fieldErrors.new_password && (
                <span className="listing-form__error">{fieldErrors.new_password}</span>
              )}
            </label>
            <label className="listing-form__field">
              <span>Подтверждение нового пароля</span>
              <input
                type="password"
                value={newPasswordConfirmation}
                onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                autoComplete="new-password"
              />
            </label>
          </fieldset>

          {formError && <p className="listing-form__server-error">{formError}</p>}
          {success && (
            <p className="listing-form__success" role="status">
              Профиль обновлён
            </p>
          )}

          <button
            className="listing-form__submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Сохранение…' : 'Сохранить'}
          </button>
        </form>
      </main>
    </div>
  )
}