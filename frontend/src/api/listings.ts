import { apiClient } from './client'

export interface Tag {
  id: string
  name: string
}

export interface Location {
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
  location: string | null
  tags: string[]
  images: ListingImage[]
}

export interface ListingImage {
  id: string
  listing_id: string
  position: number
  created_at: string
  url: string
}

export interface ListingInput {
  title: string
  description: string
  price: number
  tags: string[]
  location: string | null
  expires_in_days?: number
}

export interface ListingFilters {
  tags?: string[]
  excludeTags?: string[]
  locations?: string[]
  q?: string
  sort?: string
}

export const tagsApi = {
  list: () => apiClient.get<Tag[]>('/listings/tags'),
}

export const locationsApi = {
  list: () => apiClient.get<Location[]>('/listings/locations'),
}

export const listingsApi = {
  list: (filters: ListingFilters = {}) => {
    const params = new URLSearchParams()
    for (const tag of filters.tags ?? []) {
      params.append('tags', tag)
    }
    for (const tag of filters.excludeTags ?? []) {
      params.append('exclude_tags', tag)
    }
    for (const location of filters.locations ?? []) {
      params.append('location', location)
    }
    if (filters.q) {
      params.append('q', filters.q)
    }
    if (filters.sort) {
      params.append('sort', filters.sort)
    }
    const query = params.toString()
    return apiClient.get<Listing[]>(query ? `/listings?${query}` : '/listings')
  },
  listMine: () => apiClient.get<Listing[]>('/listings/my'),
  get: (id: string) => apiClient.get<Listing>(`/listings/${id}`),
  create: (input: ListingInput) => apiClient.post<Listing>('/listings', input),
  update: (id: string, input: ListingInput) =>
    apiClient.patch<Listing>(`/listings/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/listings/${id}`),
  uploadImages: (id: string, files: File[]) => {
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }
    return apiClient.post<ListingImage[]>(`/listings/${id}/images`, undefined, {
      body: formData,
    })
  },
  deleteImage: (listingId: string, imageId: string) =>
    apiClient.delete<void>(`/listings/${listingId}/images/${imageId}`),
}

export function imageUrl(url: string): string {
  return `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${url}`
}