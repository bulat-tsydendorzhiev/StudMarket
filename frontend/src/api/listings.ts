import { apiClient } from './client'

export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string
  price: number
  status: string
  created_at: string
  updated_at: string
  expires_at: string | null
}

export interface ListingInput {
  title: string
  description: string
  price: number
}

export const listingsApi = {
  list: () => apiClient.get<Listing[]>('/listings'),
  get: (id: string) => apiClient.get<Listing>(`/listings/${id}`),
  create: (input: ListingInput) => apiClient.post<Listing>('/listings', input),
  update: (id: string, input: ListingInput) =>
    apiClient.patch<Listing>(`/listings/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/listings/${id}`),
}