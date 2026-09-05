import { apiClient } from './client'

export interface Conversation {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  created_at: string
  updated_at: string
}

export interface ConversationListItem {
  id: string
  listing_id: string
  listing_title: string | null
  buyer_id: string
  seller_id: string
  last_message: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  text: string
  created_at: string
  read_at: string | null
}

export const chatsApi = {
  createConversation: (listingId: string) =>
    apiClient.post<Conversation>('/chat/conversations', { listing_id: listingId }),
  listConversations: () =>
    apiClient.get<ConversationListItem[]>('/chat/conversations'),
  getConversation: (conversationId: string) =>
    apiClient.get<Conversation>(`/chat/conversations/${conversationId}`),
  listMessages: (conversationId: string) =>
    apiClient.get<Message[]>(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, text: string) =>
    apiClient.post<Message>(`/chat/conversations/${conversationId}/messages`, { text }),
}