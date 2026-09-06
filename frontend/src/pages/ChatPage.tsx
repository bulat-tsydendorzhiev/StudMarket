import { Fragment, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { chatsApi, type Message } from '../api/chats'
import { usersApi } from '../api/users'
import { useAuth } from '../auth/AuthContext'
import MessagesLink from '../components/MessagesLink'
import UserAvatar, { avatarSrc } from '../components/UserAvatar'

const POLL_INTERVAL_MS = 3000

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function dayKey(timestamp: string): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatDay(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })
}

export default function ChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const messagesKey = ['chat', 'messages', conversationId]

  const { data: messages, isLoading, isError } = useQuery({
    queryKey: messagesKey,
    queryFn: () => chatsApi.listMessages(conversationId!),
    enabled: Boolean(conversationId),
    refetchInterval: POLL_INTERVAL_MS,
  })

  const { data: conversation } = useQuery({
    queryKey: ['chat', 'conversation', conversationId],
    queryFn: () => chatsApi.getConversation(conversationId!),
    enabled: Boolean(conversationId),
  })

  const otherUserId =
    conversation && user && conversation.buyer_id === user.id
      ? conversation.seller_id
      : (conversation?.buyer_id ?? null)

  const { data: otherUser } = useQuery({
    queryKey: ['auth', 'users', otherUserId],
    queryFn: () => usersApi.get(otherUserId!),
    enabled: Boolean(otherUserId),
  })

  const sendMutation = useMutation({
    mutationFn: (body: string) => chatsApi.sendMessage(conversationId!, body),
    onSuccess: () => {
      setText('')
      queryClient.invalidateQueries({ queryKey: messagesKey })
    },
  })

  const markReadMutation = useMutation({
    mutationFn: () => chatsApi.markConversationRead(conversationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] })
    },
  })

  useEffect(() => {
    if (conversationId) {
      markReadMutation.mutate()
    }
  }, [conversationId])

  const hasUnreadIncoming =
    messages?.some((message) => message.sender_id !== user?.id && message.read_at === null) ??
    false

  useEffect(() => {
    if (conversationId && hasUnreadIncoming) {
      markReadMutation.mutate()
    }
  }, [conversationId, hasUnreadIncoming])

  useEffect(() => {
    listRef.current?.scrollTo?.({ top: listRef.current.scrollHeight })
  }, [messages])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const body = text.trim()
    if (!body || sendMutation.isPending) {
      return
    }
    sendMutation.mutate(body)
  }

  const renderMessage = (message: Message) => {
    const isMine = user?.id === message.sender_id
    const sender = isMine ? 'Вы' : (otherUser?.username ?? 'Собеседник')
    const avatarPath = isMine ? user?.avatar_path : otherUser?.avatar_path
    return (
      <div
        className={`chat__message chat__message--${isMine ? 'mine' : 'other'}`}
      >
        <img
          className="chat__avatar"
          src={avatarSrc(avatarPath)}
          alt=""
          aria-hidden="true"
        />
        <div className="chat__bubble">
          <span className="chat__sender">{sender}</span>
          <p className="chat__text">{message.text}</p>
          <span className="chat__time">{formatTime(message.created_at)}</span>
        </div>
      </div>
    )
  }

  const renderMessages = () =>
    messages!.map((message, index) => {
      const prev = index > 0 ? messages![index - 1] : null
      const showDate =
        !prev || dayKey(prev.created_at) !== dayKey(message.created_at)
      return (
        <Fragment key={message.id}>
          {showDate && (
            <div className="chat__date">{formatDay(message.created_at)}</div>
          )}
          {renderMessage(message)}
        </Fragment>
      )
    })

  return (
    <div className="chat">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          StudMarket
        </Link>
        <MessagesLink />
        <UserAvatar />
      </header>

      <main className="chat__main">
        <Link className="chat__back" to="/chat">
          ← Назад
        </Link>

        {otherUser && (
          <p className="chat__peer">
            Чат с <strong>{otherUser.username}</strong>
          </p>
        )}

        {isLoading && <p className="listing-detail__status">Загрузка…</p>}

        {isError && (
          <p className="listing-detail__status">Не удалось загрузить сообщения</p>
        )}

        {!isLoading && !isError && (
          <>
            <div className="chat__list" ref={listRef}>
              {messages && messages.length > 0 ? (
                renderMessages()
              ) : (
                <p className="chat__empty">Сообщений пока нет</p>
              )}
            </div>

            <form className="chat__form" onSubmit={handleSubmit}>
              <div className="chat__input-wrap">
                <input
                  className="chat__input"
                  type="text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Введите сообщение..."
                  aria-label="Сообщение"
                />
                <button
                  className="chat__send"
                  type="submit"
                  disabled={!text.trim() || sendMutation.isPending}
                  aria-label="Отправить"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </form>
            {sendMutation.isError && (
              <p className="chat__error">Не удалось отправить сообщение</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}