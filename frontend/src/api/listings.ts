import { apiClient } from './client'

export interface Tag {
  id: string
  name: string
}

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
  tags: string[]
}

export interface ListingInput {
  title: string
  description: string
  price: number
  tags: string[]
}

export const tagsApi = {
  list: () => apiClient.get<Tag[]>('/listings/tags'),
}

export const listingsApi = {
  list: (tags: string[] = []) => {
    const params = new URLSearchParams()
    for (const tag of tags) {
      params.append('tags', tag)
    }
    const query = params.toString()
    return apiClient.get<Listing[]>(query ? `/listings?${query}` : '/listings')
  },
  get: (id: string) => apiClient.get<Listing>(`/listings/${id}`),
  create: (input: ListingInput) => apiClient.post<Listing>('/listings', input),
  update: (id: string, input: ListingInput) =>
    apiClient.patch<Listing>(`/listings/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/listings/${id}`),
}