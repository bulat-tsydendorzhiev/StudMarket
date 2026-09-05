import { apiClient } from './client'

export interface Conversation {
  id: string
  listing_id: string
  buyer_id: string
  seller_id: string
  created_at: string
  updated_at: string
}

export const chatsApi = {
  createConversation: (listingId: string) =>
    apiClient.post<Conversation>('/chat/conversations', { listing_id: listingId }),
}