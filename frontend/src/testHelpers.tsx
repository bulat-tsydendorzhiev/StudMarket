import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Listing, ListingImage, Location, Tag } from './api/listings'
import { AuthProvider } from './auth/AuthContext'

export interface MockRoute {
  status: number
  body?: unknown
}

export type MockRoutes = Record<string, MockRoute>

export function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export function stubFetch(routes: MockRoutes) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init?.method ?? 'GET'
    const pathname = url.pathname.replace(/^\/api/, '')
    
    // Collect all matching routes and pick the most specific one
    const matches: Array<{ specificity: number; route: MockRoute }> = []
    
    for (const [key, route] of Object.entries(routes)) {
      const [routeMethod, routePath] = key.split(' ')
      if (method !== routeMethod) {
        continue
      }
      const [pathPart, queryPart] = routePath.split('?')
      if (pathname !== pathPart) {
        continue
      }
      if (queryPart === undefined) {
        // Mock has no query params - matches any request to this path (lowest specificity)
        matches.push({ specificity: 0, route })
        continue
      }
      const expected = [...new URLSearchParams(queryPart).entries()]
      // Partial match: all expected params must be present in actual with same values
      const queryMatches = expected.every(([keyParam, value]) => url.searchParams.get(keyParam) === value)
      if (queryMatches) {
        // Specificity = number of expected query params (more params = more specific)
        matches.push({ specificity: expected.length, route })
      }
    }
    
    if (matches.length > 0) {
      // Pick the most specific match
      matches.sort((a, b) => b.specificity - a.specificity)
      return Promise.resolve(jsonResponse(matches[0].route.status, matches[0].route.body))
    }
    
    return Promise.resolve(jsonResponse(404))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export const currentUser = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
  avatar_path: null,
}

export function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    seller_id: currentUser.id,
    title: 'Велосипед',
    description: 'Почти новый велосипед',
    price: 1500,
    status: 'active',
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
    expires_at: null,
    location: null,
    tags: [],
    images: [],
    ...overrides,
  }
}

export function makeImage(overrides: Partial<ListingImage> = {}): ListingImage {
  return {
    id: 'image-1',
    listing_id: 'listing-1',
    position: 0,
    created_at: '2026-09-05T00:00:00Z',
    url: '/listings/listing-1/images/image-1',
    ...overrides,
  }
}

export function makeTag(id: string, name: string): Tag {
  return { id, name }
}

export function makeLocation(id: string, name: string): Location {
  return { id, name }
}

export const testTags: Tag[] = [
  makeTag('tag-electronics', 'Электроника'),
  makeTag('tag-appliances', 'Бытовая техника'),
  makeTag('tag-sport', 'Спорт'),
]

export const testLocations: Location[] = [
  makeLocation('loc-dorm-2', 'Общежитие №2'),
  makeLocation('loc-dorm-3', 'Общежитие №3'),
  makeLocation('loc-city', 'Город'),
]

export function tagsRoutes(): MockRoutes {
  return { 'GET /listings/tags': { status: 200, body: testTags } }
}

export function locationsRoutes(): MockRoutes {
  return { 'GET /listings/locations': { status: 200, body: testLocations } }
}

export function guestAuthRoutes(): MockRoutes {
  return { 'GET /auth/me': { status: 401, body: { detail: 'Не авторизован' } } }
}

export function authenticatedAuthRoutes(): MockRoutes {
  return { 'GET /auth/me': { status: 200, body: currentUser } }
}

export function renderWithProviders(ui: ReactNode, initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}