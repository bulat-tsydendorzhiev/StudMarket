import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { chatsApi } from '../api/chats'
import { useAuth } from '../auth/AuthContext'

export default function ChatListPage() {
  const { user } = useAuth()

  const { data: conversations, isLoading, isError } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: chatsApi.listConversations,
  })

  return (
    <div className="chat-list">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          StudMarket
        </Link>
      </header>

      <main className="chat-list__main">
        <h1 className="chat-list__title">Чаты</h1>

        {isLoading && <p className="listing-detail__status">Загрузка…</p>}

        {isError && (
          <p className="listing-detail__status">Не удалось загрузить чаты</p>
        )}

        {!isLoading && !isError && conversations && conversations.length === 0 && (
          <p className="chat-list__empty">Чатов пока нет</p>
        )}

        {!isLoading && !isError && conversations && conversations.length > 0 && (
          <div className="chat-list__items">
            {conversations.map((conversation) => {
              const isSeller = conversation.seller_id === user?.id
              return (
                <Link
                  className="chat-list__item"
                  key={conversation.id}
                  to={`/chat/${conversation.id}`}
                >
                  <span className="chat-list__item-title">
                    {conversation.listing_title ?? 'Объявление'}
                  </span>
                  <span className="chat-list__item-role">
                    {isSeller ? 'Вы продавец' : 'Вы покупатель'}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}