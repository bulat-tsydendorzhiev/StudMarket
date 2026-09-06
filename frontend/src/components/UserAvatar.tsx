import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export const DEFAULT_AVATAR = '/avatars/fox.png'

export const AVATAR_PRESETS = [
  { path: '/avatars/fox.png', name: 'Лиса' },
  { path: '/avatars/cat.png', name: 'Кот' },
  { path: '/avatars/dog.png', name: 'Собака' },
  { path: '/avatars/owl.png', name: 'Сова' },
  { path: '/avatars/penguin.png', name: 'Пингвин' },
  { path: '/avatars/polar_bear.png', name: 'Белый медведь' },
]

export function avatarSrc(avatarPath: string | null | undefined): string {
  return avatarPath ?? DEFAULT_AVATAR
}

interface UserAvatarProps {
  size?: number
}

export default function UserAvatar({ size = 36 }: UserAvatarProps) {
  const { user, isAuthenticated, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const handleClick = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!isAuthenticated || !user) {
    return null
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="user-avatar" ref={containerRef}>
      <button
        className="user-avatar__button"
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Профиль"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Профиль"
      >
        <img
          className="user-avatar__img"
          src={avatarSrc(user.avatar_path)}
          alt="Аватар"
          width={size}
          height={size}
        />
      </button>
      {open && (
        <div className="user-avatar__menu" role="menu">
          <Link
            className="user-avatar__item"
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Редактировать профиль
          </Link>
          <button
            className="user-avatar__item user-avatar__item--danger"
            type="button"
            role="menuitem"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? 'Выход…' : 'Выйти'}
          </button>
        </div>
      )}
    </div>
  )
}