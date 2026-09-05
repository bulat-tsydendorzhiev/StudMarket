import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/client'
import { useAuth } from '../auth/AuthContext'

interface HealthResponse {
  status: string
  service: string
}

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.get<HealthResponse>('/health'),
  })

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="home">
      <header className="home__header">
        <span className="home__logo">StudMarket</span>
        <nav className="home__nav">
          {isAuthenticated && user ? (
            <>
              <span className="home__username">{user.username}</span>
              <button
                className="home__button"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? 'Выход…' : 'Выйти'}
              </button>
            </>
          ) : (
            <>
              <Link className="home__link" to="/login">
                Войти
              </Link>
              <Link className="home__link home__link--primary" to="/register">
                Зарегистрироваться
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="home__main">
        <h1 className="home__title">StudMarket</h1>
        <p className="home__subtitle">Купить и продать среди студентов</p>

        <div className="home__status" role="status">
          {isLoading && 'Проверка подключения к API…'}
          {isError && 'API недоступно'}
          {data && `API работает (${data.service})`}
        </div>
      </main>
    </div>
  )
}