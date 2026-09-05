import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listingsApi, tagsApi, type Listing, type Tag } from '../api/listings'
import { useAuth } from '../auth/AuthContext'

export function formatPrice(price: number): string {
  if (price === 0) {
    return 'Бесплатно'
  }
  return `${price} ₽`
}

function isDormitory(name: string): boolean {
  return name.startsWith('Общежитие')
}

function dormitoryNumber(name: string): number {
  const match = name.match(/№(\d+)/)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings', selectedTags],
    queryFn: () => listingsApi.list(selectedTags),
  })

  const categories = (tags ?? [])
    .filter((tag: Tag) => !isDormitory(tag.name))
    .sort((a, b) => a.name.localeCompare(b.name))
  const dormitories = (tags ?? [])
    .filter((tag: Tag) => isDormitory(tag.name))
    .sort((a, b) => dormitoryNumber(a.name) - dormitoryNumber(b.name))

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((tag) => tag !== name) : [...prev, name],
    )
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

        <div className="home__content">
          <aside className="filters">
            <h2 className="filters__title">Фильтры</h2>

            {categories.length > 0 && (
              <div className="filters__group">
                {categories.map((tag: Tag) => (
                  <label className="filters__item" key={tag.id}>
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.name)}
                      onChange={() => toggleTag(tag.name)}
                    />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            )}

            {dormitories.length > 0 && (
              <div className="filters__group">
                {dormitories.map((tag: Tag) => (
                  <label className="filters__item" key={tag.id}>
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.name)}
                      onChange={() => toggleTag(tag.name)}
                    />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </div>
            )}
          </aside>

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
                      {listing.tags.length > 0 && (
                        <span className="listing-card__tags">
                          {listing.tags.join(' · ')}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}