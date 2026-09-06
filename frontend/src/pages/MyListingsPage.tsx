import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { imageUrl, listingsApi } from '../api/listings'
import MessagesLink from '../components/MessagesLink'
import UserAvatar from '../components/UserAvatar'
import { formatPrice } from './HomePage'

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активно',
  SOLD: 'Продано',
  EXPIRED: 'Истекло',
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—'
  }
  return new Date(value).toLocaleDateString('ru-RU')
}

export default function MyListingsPage() {
  const { data: listings, isLoading, isError } = useQuery({
    queryKey: ['listings', 'mine'],
    queryFn: listingsApi.listMine,
  })

  return (
    <div className="my-listings">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          StudMarket
        </Link>
        <MessagesLink />
        <UserAvatar />
      </header>

      <main className="my-listings__main">
        <h1 className="my-listings__title">Мои объявления</h1>

        {isLoading && <p className="listing-detail__status">Загрузка…</p>}

        {isError && (
          <p className="listing-detail__status">Не удалось загрузить объявления</p>
        )}

        {!isLoading && !isError && listings && listings.length === 0 && (
          <div className="my-listings__empty">
            <p className="my-listings__empty-text">У вас пока нет объявлений</p>
            <Link className="listing-detail__edit" to="/listings/new">
              Разместить объявление
            </Link>
          </div>
        )}

        {!isLoading && !isError && listings && listings.length > 0 && (
          <div className="listings__grid">
            {listings.map((listing) => (
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
                    'Фото скоро появится'
                  )}
                </div>
                <div className="listing-card__body">
                  <span className="listing-card__price">
                    {formatPrice(listing.price)}
                  </span>
                  <span className="listing-card__title">{listing.title}</span>
                  <span className="my-listings__status">
                    {STATUS_LABELS[listing.status] ?? listing.status}
                  </span>
                  <span className="my-listings__meta">
                    Создано · {formatDate(listing.created_at)}
                  </span>
                  <span className="my-listings__meta">
                    Действует до · {formatDate(listing.expires_at)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
