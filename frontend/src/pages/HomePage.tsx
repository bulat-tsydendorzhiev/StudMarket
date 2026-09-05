import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listingsApi, type Listing } from '../api/listings'
import { useAuth } from '../auth/AuthContext'

export function formatPrice(price: number): string {
  if (price === 0) {
    return 'Бесплатно'
  }
  return `${price} ₽`
}

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings'],
    queryFn: listingsApi.list,
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
              <Link className="home__link home__link--primary" to="/listings/new">
                Разместить объявление
              </Link>
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

        <section className="listings">
          <div className="listings__status" role="status">
            {isLoading && 'Загрузка объявлений…'}
            {isError && 'Не удалось загрузить объявления'}
            {!isLoading && !isError && listings && listings.length === 0 && (
              'Объявлений пока нет'
            )}
          </div>

          {!isLoading && !isError && listings && listings.length > 0 && (
            <div className="listings__grid">
              {listings.map((listing: Listing) => (
                <Link
                  className="listing-card"
                  key={listing.id}
                  to={`/listings/${listing.id}`}
                >
                  <div className="listing-card__photo">Фото скоро появится</div>
                  <div className="listing-card__body">
                    <span className="listing-card__price">
                      {formatPrice(listing.price)}
                    </span>
                    <span className="listing-card__title">{listing.title}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}