import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Listing, Tag } from './api/listings'
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
    for (const [key, route] of Object.entries(routes)) {
      const [routeMethod, routePath] = key.split(' ')
      if (method !== routeMethod) {
        continue
      }
      const [pathPart, queryPart] = routePath.split('?')
      if (url.pathname !== pathPart) {
        continue
      }
      if (queryPart === undefined) {
        if (url.search === '') {
          return Promise.resolve(jsonResponse(route.status, route.body))
        }
        continue
      }
      const expected = [...new URLSearchParams(queryPart).entries()]
      const actual = [...url.searchParams.entries()]
      const queryMatches =
        expected.length === actual.length &&
        expected.every(([keyParam, value]) => url.searchParams.get(keyParam) === value)
      if (queryMatches) {
        return Promise.resolve(jsonResponse(route.status, route.body))
      }
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
    tags: [],
    ...overrides,
  }
}

export function makeTag(id: string, name: string): Tag {
  return { id, name }
}

export const testTags: Tag[] = [
  makeTag('tag-electronics', 'Электроника'),
  makeTag('tag-appliances', 'Бытовая техника'),
  makeTag('tag-sport', 'Спорт'),
  makeTag('tag-dorm-2', 'Общежитие №2'),
  makeTag('tag-dorm-3', 'Общежитие №3'),
]

export function tagsRoutes(): MockRoutes {
  return { 'GET /listings/tags': { status: 200, body: testTags } }
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