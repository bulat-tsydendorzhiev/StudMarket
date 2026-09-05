import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

interface MockRoute {
  status: number
  body?: unknown
  method?: string
}

type MockRoutes = Record<string, MockRoute>

function stubFetch(routes: MockRoutes) {
  const fetchMock = vi.fn(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      for (const [key, route] of Object.entries(routes)) {
        const [routeMethod, routePath] = key.split(' ')
        if (url.endsWith(routePath) && method === routeMethod) {
          return Promise.resolve(
            new Response(
              route.body === undefined ? null : JSON.stringify(route.body),
              {
                status: route.status,
                headers: { 'Content-Type': 'application/json' },
              },
            ),
          )
        }
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    },
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function guestRoutes(): MockRoutes {
  return {
    'GET /auth/me': { status: 401, body: { detail: 'Не авторизован' } },
    'GET /health': { status: 200, body: { status: 'ok', service: 'api-gateway' } },
    'POST /auth/logout': { status: 204 },
  }
}

function authenticatedRoutes(): MockRoutes {
  return {
    'GET /auth/me': {
      status: 200,
      body: { id: 'uuid-1', username: 'alice', email: 'alice@example.com' },
    },
    'GET /health': { status: 200, body: { status: 'ok', service: 'api-gateway' } },
    'POST /auth/logout': { status: 204 },
  }
}

function mockFetchOk() {
  stubFetch(guestRoutes())
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockFetchOk()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders the home page and shows gateway health status on "/"', async () => {
    window.history.pushState({}, '', '/')
    renderApp()

    expect(screen.getByRole('heading', { name: 'StudMarket' })).toBeInTheDocument()
    expect(await screen.findByText('API работает (api-gateway)')).toBeInTheDocument()
  })

  it('renders the not found page for unknown routes', () => {
    window.history.pushState({}, '', '/unknown')
    renderApp()

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()
  })

  it('renders the registration page on "/register" for guests', async () => {
    window.history.pushState({}, '', '/register')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Регистрация' })).toBeInTheDocument()
  })

  it('renders the login page on "/login" for guests', async () => {
    window.history.pushState({}, '', '/login')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('requests the current user on startup', async () => {
    const fetchMock = stubFetch(guestRoutes())
    window.history.pushState({}, '', '/')
    renderApp()

    await screen.findByText('API работает (api-gateway)')
    await screen.findByRole('link', { name: 'Войти' })

    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith('/auth/me')),
    ).toBe(true)
  })

  it('shows login and register links for guests', async () => {
    window.history.pushState({}, '', '/')
    renderApp()

    expect(await screen.findByRole('link', { name: 'Войти' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Зарегистрироваться' }),
    ).toBeInTheDocument()
  })

  it('redirects authenticated users away from "/login"', async () => {
    stubFetch(authenticatedRoutes())
    window.history.pushState({}, '', '/login')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'StudMarket' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Вход' })).not.toBeInTheDocument()
  })

  it('redirects authenticated users away from "/register"', async () => {
    stubFetch(authenticatedRoutes())
    window.history.pushState({}, '', '/register')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'StudMarket' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Регистрация' })).not.toBeInTheDocument()
  })

  it('shows the username and a logout button for authenticated users', async () => {
    stubFetch(authenticatedRoutes())
    window.history.pushState({}, '', '/')
    renderApp()

    expect(await screen.findByText('alice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeInTheDocument()
  })

  it('logs out and switches back to guest UI', async () => {
    stubFetch(authenticatedRoutes())
    window.history.pushState({}, '', '/')
    renderApp()

    const logoutButton = await screen.findByRole('button', { name: 'Выйти' })
    await act(async () => {
      logoutButton.click()
    })

    expect(await screen.findByRole('link', { name: 'Войти' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Выйти' })).not.toBeInTheDocument()
  })
})