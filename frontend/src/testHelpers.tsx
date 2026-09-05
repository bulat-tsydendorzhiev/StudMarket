import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Listing } from './api/listings'
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
    const url = String(input)
    const method = init?.method ?? 'GET'
    for (const [key, route] of Object.entries(routes)) {
      const [routeMethod, routePath] = key.split(' ')
      if (url.endsWith(routePath) && method === routeMethod) {
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
    ...overrides,
  }
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