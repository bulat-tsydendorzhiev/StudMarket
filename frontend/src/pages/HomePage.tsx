import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  imageUrl,
  locationsApi,
  listingsApi,
  tagsApi,
  type Listing,
  type Location,
  type Tag,
} from '../api/listings'
import { useAuth } from '../auth/AuthContext'
import MessagesLink from '../components/MessagesLink'
import UserAvatar from '../components/UserAvatar'

export function formatPrice(price: number): string {
  if (price === 0) {
    return 'Бесплатно'
  }
  return `${price} ₽`
}

export default function HomePage() {
  const { user, isAuthenticated } = useAuth()
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [excludedTags, setExcludedTags] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.list,
  })

  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings', selectedTags, excludedTags, selectedLocations],
    queryFn: () =>
      listingsApi.list({
        tags: selectedTags,
        excludeTags: excludedTags,
        locations: selectedLocations,
      }),
  })

  const categories = (tags ?? []).sort((a: Tag, b: Tag) =>
    a.name.localeCompare(b.name),
  )

  const cycleTag = (name: string) => {
    const included = selectedTags.includes(name)
    const excluded = excludedTags.includes(name)
    if (included) {
      setSelectedTags((prev) => prev.filter((tag) => tag !== name))
      setExcludedTags((prev) => [...prev, name])
    } else if (excluded) {
      setExcludedTags((prev) => prev.filter((tag) => tag !== name))
    } else {
      setSelectedTags((prev) => [...prev, name])
    }
  }

  const toggleLocation = (name: string) => {
    setSelectedLocations((prev) =>
      prev.includes(name)
        ? prev.filter((location) => location !== name)
        : [...prev, name],
    )
  }

  return (
    <div className="home">
      <header className="home__header">
        <span className="home__logo">
          Stud<span className="brand__market">Market</span>
        </span>
        <nav className="home__nav">
          {isAuthenticated && user ? (
            <>
              <Link className="home__link home__link--primary" to="/listings/new">
                Разместить объявление
              </Link>
              <MessagesLink />
              <UserAvatar />
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
        <h1 className="home__title" aria-label="StudMarket">Stud<span className="brand__market">Market</span></h1>
        <p className="home__subtitle">Купить и продать среди студентов</p>

        <div className="home__content">
          <aside className="filters">
            <h2 className="filters__title">Фильтры</h2>

            {categories.length > 0 && (
              <div className="filters__group">
                {categories.map((tag: Tag) => {
                  const included = selectedTags.includes(tag.name)
                  const excluded = excludedTags.includes(tag.name)
                  return (
                    <label className="filters__item" key={tag.id}>
                      <input
                        type="checkbox"
                        className={
                          excluded
                            ? 'filters__checkbox filters__checkbox--excluded'
                            : 'filters__checkbox'
                        }
                        checked={included}
                        onChange={() => cycleTag(tag.name)}
                      />
                      <span>{tag.name}</span>
                    </label>
                  )
                })}
              </div>
            )}

            {locations && locations.length > 0 && (
              <div className="filters__group">
                {locations.map((location: Location) => (
                  <label className="filters__item" key={location.id}>
                    <input
                      type="checkbox"
                      className="filters__checkbox"
                      checked={selectedLocations.includes(location.name)}
                      onChange={() => toggleLocation(location.name)}
                    />
                    <span>{location.name}</span>
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
                    <div className="listing-card__photo">
                      {(listing.images ?? []).length > 0 ? (
                        <img
                          className="listing-card__img"
                          src={imageUrl(listing.images[0].url)}
                          alt={listing.title}
                        />
                      ) : (
                        'Без фото'
                      )}
                    </div>
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