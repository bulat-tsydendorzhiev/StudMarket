import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { chatsApi, type ConversationListItem } from '../api/chats'
import { usersApi } from '../api/users'
import { useAuth } from '../auth/AuthContext'

function ConversationRow({ conversation }: { conversation: ConversationListItem }) {
  const { user } = useAuth()

  const otherUserId =
    conversation && user && conversation.buyer_id === user.id
      ? conversation.seller_id
      : (conversation?.buyer_id ?? null)

  const { data: otherUser } = useQuery({
    queryKey: ['auth', 'users', otherUserId],
    queryFn: () => usersApi.get(otherUserId!),
    enabled: Boolean(otherUserId),
  })

  return (
    <Link
      className="chat-list__item"
      key={conversation.id}
      to={`/chat/${conversation.id}`}
    >
      <span className="chat-list__item-title">
        {otherUser?.username ?? 'Собеседник'}
      </span>
      <span className="chat-list__item-subtitle">
        {conversation.last_message ?? 'Сообщений пока нет'}
      </span>
    </Link>
  )
}

export default function ChatListPage() {
  const { data: conversations, isLoading, isError } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: chatsApi.listConversations,
  })

  return (
    <div className="chat-list">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          Stud<span className="brand__market">Market</span>
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
            {conversations.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}