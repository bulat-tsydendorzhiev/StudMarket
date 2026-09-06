import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { chatsApi, type ConversationListItem } from '../api/chats'
import { imageUrl, listingsApi } from '../api/listings'
import { usersApi } from '../api/users'
import MessagesLink from '../components/MessagesLink'
import UserAvatar from '../components/UserAvatar'

function formatListTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'numeric',
  })
}

function ConversationRow({ conversation }: { conversation: ConversationListItem }) {
  const { data: listing } = useQuery({
    queryKey: ['listings', conversation.listing_id],
    queryFn: () => listingsApi.get(conversation.listing_id),
    enabled: Boolean(conversation.listing_id),
  })

  const { data: otherUser } = useQuery({
    queryKey: ['auth', 'users', conversation.other_user],
    queryFn: () => usersApi.get(conversation.other_user),
    enabled: Boolean(conversation.other_user),
  })

  const photo = listing?.images?.[0]
  const peerName = otherUser?.username ?? 'Собеседник'
  const listingTitle = conversation.listing_title ?? 'Объявление'
  const hasUnread = (conversation.unread_count ?? 0) > 0

  return (
    <Link
      className="chat-list__item"
      key={conversation.id}
      to={`/chat/${conversation.id}`}
    >
      <div className="chat-list__photo">
        {photo ? (
          <img
            className="chat-list__photo-img"
            src={imageUrl(photo.url)}
            alt={listingTitle}
          />
        ) : (
          <span className="chat-list__photo-placeholder">Без фото</span>
        )}
      </div>

      <div className="chat-list__body">
        <span className="chat-list__peer">{peerName}</span>
        <span className="chat-list__listing">{listingTitle}</span>
        <span className="chat-list__last">
          <span className="chat-list__subtitle">
            {conversation.last_message ?? 'Сообщений пока нет'}
          </span>
          {conversation.last_message_at && (
            <span className="chat-list__time">
              {formatListTime(conversation.last_message_at)}
            </span>
          )}
        </span>
      </div>

      {hasUnread && <span className="chat-list__dot" aria-label="Непрочитанные сообщения" />}
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
        <MessagesLink />
        <UserAvatar />
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