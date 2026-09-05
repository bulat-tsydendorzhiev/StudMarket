import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { chatsApi } from '../api/chats'
import { listingsApi } from '../api/listings'
import { useAuth } from '../auth/AuthContext'
import { formatPrice } from './HomePage'

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

  return (
    <div className="listing-detail">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          StudMarket
        </Link>
      </header>

      <main className="listing-detail__main">
        <div className="listing-detail__photo">Фото скоро появится</div>

        <h1 className="listing-detail__title">{listing.title}</h1>
        <p className="listing-detail__price">{formatPrice(listing.price)}</p>

        <section className="listing-detail__block">
          <h2 className="listing-detail__heading">Описание</h2>
          <div className="listing-detail__description markdown">
            <ReactMarkdown>{listing.description}</ReactMarkdown>
          </div>
        </section>

        {isAuthenticated && !isOwner && (
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