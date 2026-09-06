import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { chatsApi } from '../api/chats'
import { listingsApi } from '../api/listings'
import { useAuth } from '../auth/AuthContext'
import ImageManager from '../components/ImageManager'
import MessagesLink from '../components/MessagesLink'
import UserAvatar from '../components/UserAvatar'
import { formatPrice } from './HomePage'

function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) {
    return null
  }
  const remaining = new Date(expiresAt).getTime() - Date.now()
  return remaining > 0 ? Math.ceil(remaining / (1000 * 60 * 60 * 24)) : 0
}

function formatDays(days: number): string {
  const mod10 = days % 10
  const mod100 = days % 100
  if (mod10 === 1 && mod100 !== 11) {
    return `${days} день`
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${days} дня`
  }
  return `${days} дней`
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listings', id],
    queryFn: () => listingsApi.get(id!),
    enabled: Boolean(id),
  })

  const deleteMutation = useMutation({
    mutationFn: () => listingsApi.remove(id!),
    onSuccess: () => navigate('/'),
  })

  const chatMutation = useMutation({
    mutationFn: () => chatsApi.createConversation(id!),
    onSuccess: (conversation) => navigate(`/chat/${conversation.id}`),
  })

  if (isLoading) {
    return <p className="listing-detail__status">Загрузка…</p>
  }

  if (isError || !listing) {
    return (
      <div className="listing-detail">
        <p className="listing-detail__status">Объявление не найдено</p>
        <Link to="/">На главную</Link>
      </div>
    )
  }

  const isOwner = user?.id === listing.seller_id
  const isExpired = listing.status === 'EXPIRED'
  const daysLeft = daysUntil(listing.expires_at)

  return (
    <div className="listing-detail">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          Stud<span className="brand__market">Market</span>
        </Link>
        <MessagesLink />
        <UserAvatar />
      </header>

      <main className="listing-detail__main">
        <ImageManager
          listingId={listing.id}
          images={listing.images ?? []}
          owner={isOwner}
        />

        <h1 className="listing-detail__title">{listing.title}</h1>
        {isExpired && (
          <div className="listing-detail__expired" role="status">
            Объявление истекло
          </div>
        )}
        <p className="listing-detail__price">{formatPrice(listing.price)}</p>
        {!isExpired && daysLeft !== null && (
          <p className="listing-detail__expiration" role="status">
            {daysLeft > 0
              ? `Осталось ${formatDays(daysLeft)}`
              : 'Истекает сегодня'}
          </p>
        )}

        {listing.tags.length > 0 && (
          <div className="listing-detail__tags">
            {listing.tags.map((tag) => (
              <span className="listing-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {listing.location && (
          <div className="listing-detail__block">
            <h2 className="listing-detail__heading">Локация</h2>
            <span className="listing-tag">{listing.location}</span>
          </div>
        )}

        <section className="listing-detail__block">
          <h2 className="listing-detail__heading">Описание</h2>
          <div className="listing-detail__description markdown">
            <ReactMarkdown>{listing.description}</ReactMarkdown>
          </div>
        </section>

        {isAuthenticated && !isOwner && !isExpired && (
          <div className="listing-detail__actions">
            <button
              className="listing-detail__chat"
              type="button"
              onClick={() => chatMutation.mutate()}
              disabled={chatMutation.isPending || chatMutation.isSuccess}
            >
              {chatMutation.isPending ? 'Отправка…' : 'Написать продавцу'}
            </button>
            {chatMutation.isSuccess && (
              <p className="listing-detail__success">Чат с продавцом открыт</p>
            )}
            {chatMutation.isError && (
              <p className="listing-detail__error">Не удалось начать чат</p>
            )}
          </div>
        )}

        {isOwner && (
          <div className="listing-detail__actions">
            <Link className="listing-detail__edit" to={`/listings/${listing.id}/edit`}>
              Редактировать
            </Link>
            <button
              className="listing-detail__delete"
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Удаление…' : 'Удалить'}
            </button>
            {deleteMutation.isError && (
              <p className="listing-detail__error">Не удалось удалить объявление</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}