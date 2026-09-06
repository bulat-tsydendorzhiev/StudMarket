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
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <Link className="user-avatar" to="/profile" aria-label="Профиль" title="Профиль">
      <img
        className="user-avatar__img"
        src={avatarSrc(user.avatar_path)}
        alt="Аватар"
        width={size}
        height={size}
      />
    </Link>
  )
}