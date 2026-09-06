import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { chatsApi } from '../api/chats'
import { useAuth } from '../auth/AuthContext'

export default function MessagesLink() {
  const { isAuthenticated } = useAuth()

  const { data: conversations } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: chatsApi.listConversations,
    enabled: isAuthenticated,
  })

  if (!isAuthenticated) {
    return null
  }

  const totalUnread = (conversations ?? []).reduce(
    (sum, conversation) => sum + (conversation.unread_count ?? 0),
    0,
  )

  return (
    <Link className="messages-link" to="/chat" aria-label="Чаты">
      <span className="messages-link__icon" aria-hidden="true">
        💬
      </span>
      {totalUnread > 0 && (
        <span className="messages-link__dot" aria-hidden="true" />
      )}
    </Link>
  )
}