import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

interface MockRoute {
  status: number
  body?: unknown
}

type MockRoutes = Record<string, MockRoute>

function jsonResponse(status: number, body: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function stubFetch(routes: MockRoutes) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    for (const [key, route] of Object.entries(routes)) {
      const [routeMethod, routePath] = key.split(' ')
      if (url.endsWith(routePath) && method === routeMethod) {
        return Promise.resolve(jsonResponse(route.status, route.body))
      }
    }
    return Promise.resolve(jsonResponse(404, undefined))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function Harness() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  return (
    <div>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <button type="button" onClick={() => logout()}>
        Logout
      </button>
    </div>
  )
}

function renderHarness() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Harness />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AuthContext', () => {
  it('marks the user as authenticated when /auth/me returns 200', async () => {
    stubFetch({
      'GET /auth/me': {
        status: 200,
        body: { id: 'uuid-1', username: 'alice', email: 'alice@example.com' },
      },
    })
    renderHarness()

    expect(await screen.findByText('true', { selector: '[data-testid=isAuthenticated]' })).toBeInTheDocument()
    expect(screen.getByTestId('username')).toHaveTextContent('alice')
  })

  it('treats a 401 from /auth/me as a guest', async () => {
    stubFetch({ 'GET /auth/me': { status: 401, body: { detail: 'Не авторизован' } } })
    renderHarness()

    expect(
      await screen.findByText('false', { selector: '[data-testid=isAuthenticated]' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('username')).toHaveTextContent('none')
  })

  it('logs out and reverts to guest', async () => {
    const fetchMock = stubFetch({
      'GET /auth/me': {
        status: 200,
        body: { id: 'uuid-1', username: 'alice', email: 'alice@example.com' },
      },
      'POST /auth/logout': { status: 204 },
    })
    renderHarness()

    await screen.findByText('true', { selector: '[data-testid=isAuthenticated]' })
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }))

    expect(
      await screen.findByText('false', { selector: '[data-testid=isAuthenticated]' }),
    ).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) => String(input).endsWith('/auth/logout') && (init?.method ?? 'GET') === 'POST',
      ),
    ).toBe(true)
  })
})