import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { chatsApi, type Message } from '../api/chats'
import { usersApi } from '../api/users'
import { useAuth } from '../auth/AuthContext'
import MarkdownEditor from '../components/MarkdownEditor'

const POLL_INTERVAL_MS = 3000

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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
    return (
      <div
        key={message.id}
        className={`chat__message chat__message--${isMine ? 'mine' : 'other'}`}
      >
        <div className="chat__bubble">
          <span className="chat__sender">{sender}</span>
          <div className="chat__text markdown">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
          <span className="chat__time">{formatTime(message.created_at)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="chat">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          StudMarket
        </Link>
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
                messages.map(renderMessage)
              ) : (
                <p className="chat__empty">Сообщений пока нет</p>
              )}
            </div>

            <form className="chat__form" onSubmit={handleSubmit}>
              <MarkdownEditor
                value={text}
                onChange={setText}
                rows={3}
                ariaLabel="Сообщение"
              />
              <div className="chat__form-actions">
                <button
                  className="chat__submit"
                  type="submit"
                  disabled={!text.trim() || sendMutation.isPending}
                >
                  {sendMutation.isPending ? 'Отправка…' : 'Отправить'}
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