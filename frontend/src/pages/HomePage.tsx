import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import {
  imageUrl,
  locationsApi,
  listingsApi,
  tagsApi,
  type Listing,
  type Location,
  type Tag,
} from '../api/listings'
import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../auth/AuthContext'

export function formatPrice(price: number): string {
  if (price === 0) {
    return 'Бесплатно'
  }
  return `${price} ₽`
}

const TAG_COLORS = ['tag-green', 'tag-blue', 'tag-orange', 'tag-purple', 'tag-rose']

function tagColor(index: number): string {
  return TAG_COLORS[index % TAG_COLORS.length]
}

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const query = searchParams.get('q') ?? ''
  const location = useLocation()

  useEffect(() => {
    if (location.hash === '#how-it-works') {
      const target = document.getElementById('how-it-works')
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY
        const y = top - (window.innerHeight - target.offsetHeight) / 2
        window.scrollTo({ top: Math.max(y, 0), behavior: 'smooth' })
      }
    }
  }, [location.hash])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [excludedTags, setExcludedTags] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<string>('newest')

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.list,
  })

  const { data: listings, isLoading, isError, refetch } = useQuery({
    queryKey: ['listings', selectedTags, excludedTags, selectedLocations, query, sortOrder],
    queryFn: () =>
      listingsApi.list({
        tags: selectedTags,
        excludeTags: excludedTags,
        locations: selectedLocations,
        q: query,
        sort: sortOrder,
      }),
    enabled: isAuthenticated,
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

  const handleApplyFilters = () => {
    void refetch()
  }

  const handleResetFilters = () => {
    setSelectedTags([])
    setExcludedTags([])
    setSelectedLocations([])
    setSortOrder('newest')
    void refetch()
  }

  return (
    <div className="home">
      <SiteHeader searchDefault={query} />

      <main className="home__main">
        <div className="home__hero">
          <h1 className="home__title" aria-label="StudMarket">
            Stud<span className="home__title-accent">Market</span>
          </h1>
          <p className="home__subtitle">Купить и продать среди студентов</p>
        </div>

        <div className="home__content">
          <aside className="filters">
            <h2 className="filters__title">Фильтры</h2>

            {categories.length > 0 && (
              <div className="filters__group">
                {categories.map((tag: Tag) => {
                  const included = selectedTags.includes(tag.name)
                  const excluded = excludedTags.includes(tag.name)
                  const sign = included ? '+' : excluded ? '−' : ''
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
                      <span className="filters__tag-label">
                        {sign && (
                          <span className="filters__tag-sign" aria-hidden="true">
                            {sign}
                          </span>
                        )}
                        {tag.name}
                      </span>
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
                    <span className="filters__tag-label">{location.name}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="filters__group">
              <div className="filters__item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label className="filters__tag-label" style={{ marginBottom: '8px' }}>
                  Сортировка:
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="navbar-search__input"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px' }}
                >
                  <option value="newest">Сначала новые</option>
                  <option value="cheapest">Сначала дешевле</option>
                  <option value="most_expensive">Сначала дороже</option>
                </select>
              </div>

              <button
                onClick={handleApplyFilters}
                className="site-header__cta"
                style={{ marginTop: '16px', width: '100%' }}
              >
                Показать
              </button>

              {(selectedTags.length > 0 || excludedTags.length > 0 || selectedLocations.length > 0 || sortOrder !== 'newest') && (
                <button
                  onClick={handleResetFilters}
                  className="navbar-search__input"
                  style={{ marginTop: '8px', cursor: 'pointer', background: '#f8f9f5', borderColor: '#e0e5dd' }}
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          </aside>

          <section className="listings">
            <div className="listings__controls" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#29372e' }}>
                Все объявления
              </h3>
              <div style={{ fontSize: '13px', color: '#68736a' }}>
                {listings ? `${listings.length} объявлений` : 'Загрузка...'}
              </div>
            </div>

            {(isLoading || isError || (listings && listings.length === 0)) && (
              <div className="listings__status" role="status">
                {isLoading && 'Загрузка объявлений…'}
                {isError && 'Не удалось загрузить объявления'}
                {!isLoading && !isError && listings && listings.length === 0 && (
                  'Объявлений пока нет'
                )}
              </div>
            )}

            {!isLoading && !isError && listings && listings.length > 0 && (
              <div className="listings__grid">
                {listings.map((listing: Listing, idx: number) => {
                  const isFree = listing.price === 0
                  return (
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
                        <span className={`listing-card__price${isFree ? ' listing-card__price--free' : ''}`}>
                          {formatPrice(listing.price)}
                        </span>
                        <span className="listing-card__title">{listing.title}</span>
                        {listing.tags.length > 0 && (
                          <div className="listing-card__tags">
                            {listing.tags.map((tagName, tIdx) => (
                              <span
                                className={`listing-card__tag ${tagColor(idx + tIdx)}`}
                                key={tagName}
                              >
                                {tagName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="listing-card__cta">
                        Открыть объявление →
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <section id="how-it-works" className="how-it-works">
        <div className="how-it-works__inner">
          <p className="how-it-works__label">Просто и по-соседски</p>
          <h2 className="how-it-works__title">Как работает StudMarket</h2>
          <div className="how-it-works__grid">
            {[
              { step: '1', title: 'Найди нужное', text: 'Выбери предпочтительные локации и отфильтруй объявления по тегам.' },
              { step: '2', title: 'Напиши продавцу', text: 'Договорись о месте и времени встречи.' },
              { step: '3', title: 'Забери безопасно', text: 'Профили студентов и локальные встречи делают обмен спокойнее.' },
            ].map((item) => (
              <div className="how-it-works__item" key={item.step}>
                <span className="how-it-works__icon">{item.step}</span>
                <h3 className="how-it-works__item-title">{item.title}</h3>
                <p className="how-it-works__item-text">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="free-space">
        <div className="free-space__inner">
          <p className="free-space__label">Освободи место в комнате</p>
          <h2 className="free-space__title">Есть вещь, которой ты не пользуешься?</h2>
          <p className="free-space__text">
            Создай объявление за пару минут — новый хозяин уже рядом.
          </p>
          <Link className="free-space__cta" to={isAuthenticated ? '/listings/new' : '/register'}>
            + Подать объявление →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
