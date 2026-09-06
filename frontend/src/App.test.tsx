import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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
    'GET /listings': { status: 200, body: [] },
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
    'GET /listings': { status: 200, body: [] },
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
  it('renders the home page on "/" with the listings state', async () => {
    window.history.pushState({}, '', '/')
    renderApp()

    expect(screen.getByRole('heading', { name: 'StudMarket' })).toBeInTheDocument()
    expect(await screen.findByText('Объявлений пока нет')).toBeInTheDocument()
  })

  it('renders listing cards on the home page', async () => {
    stubFetch({
      ...guestRoutes(),
      'GET /listings': {
        status: 200,
        body: [
          {
            id: 'listing-1',
            seller_id: 'uuid-1',
            title: 'Велосипед',
            description: 'Почти новый',
            price: 1500,
            status: 'active',
            created_at: '2026-09-05T00:00:00Z',
            updated_at: '2026-09-05T00:00:00Z',
            expires_at: null,
            tags: [],
          },
        ],
      },
    })
    window.history.pushState({}, '', '/')
    renderApp()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.getByText('1500 ₽')).toBeInTheDocument()
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

    await screen.findByText('Объявлений пока нет')
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
    expect(
      screen.getByRole('link', { name: 'Разместить объявление' }),
    ).toBeInTheDocument()
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

  it('redirects guests away from "/listings/new" to "/login"', async () => {
    stubFetch(guestRoutes())
    window.history.pushState({}, '', '/listings/new')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('redirects guests away from "/chat/:conversationId" to "/login"', async () => {
    stubFetch(guestRoutes())
    window.history.pushState({}, '', '/chat/conv-1')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('redirects guests away from "/chat" to "/login"', async () => {
    stubFetch(guestRoutes())
    window.history.pushState({}, '', '/chat')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('renders the chat list page for authenticated users', async () => {
    stubFetch({
      ...authenticatedRoutes(),
      'GET /chat/conversations': { status: 200, body: [] },
    })
    window.history.pushState({}, '', '/chat')
    renderApp()

    expect(
      await screen.findByText('Чатов пока нет'),
    ).toBeInTheDocument()
  })

  it('renders the chat page for authenticated users', async () => {
    stubFetch({
      ...authenticatedRoutes(),
      'GET /chat/conversations/conv-1': {
        status: 200,
        body: {
          id: 'conv-1',
          listing_id: 'listing-1',
          buyer_id: 'uuid-1',
          seller_id: 'uuid-other',
          created_at: '2026-09-05T00:00:00Z',
          updated_at: '2026-09-05T00:00:00Z',
        },
      },
      'GET /auth/users/uuid-other': {
        status: 200,
        body: { id: 'uuid-other', username: 'bob' },
      },
      'GET /chat/conversations/conv-1/messages': { status: 200, body: [] },
    })
    window.history.pushState({}, '', '/chat/conv-1')
    renderApp()

    expect(
      await screen.findByText('Сообщений пока нет'),
    ).toBeInTheDocument()
  })

  it('redirects guests away from "/profile" to "/login"', async () => {
    stubFetch(guestRoutes())
    window.history.pushState({}, '', '/profile')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('renders the profile page for authenticated users', async () => {
    stubFetch(authenticatedRoutes())
    window.history.pushState({}, '', '/profile')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Профиль' })).toBeInTheDocument()
    expect(screen.getByLabelText('Имя пользователя')).toHaveValue('alice')
    expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com')
    expect(
      screen.getByRole('link', { name: 'Профиль' }),
    ).toHaveAttribute('href', '/profile')
  })

  it('shows the authenticated UI on the home page after login', async () => {
    stubFetch({
      ...guestRoutes(),
      'POST /auth/login': {
        status: 200,
        body: { id: 'uuid-1', username: 'alice', email: 'alice@example.com' },
      },
    })
    window.history.pushState({}, '', '/login')
    renderApp()

    await screen.findByRole('heading', { name: 'Вход' })
    fireEvent.change(screen.getByLabelText('Имя пользователя или email'), {
      target: { value: 'alice' },
    })
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('heading', { name: 'StudMarket' })).toBeInTheDocument()
    expect(await screen.findByText('alice')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Войти' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Зарегистрироваться' }),
    ).not.toBeInTheDocument()
  })

  it('shows the authenticated UI on the home page after registration', async () => {
    stubFetch({
      ...guestRoutes(),
      'POST /auth/register': {
        status: 201,
        body: { id: 'uuid-1', username: 'alice', email: 'alice@example.com' },
      },
    })
    window.history.pushState({}, '', '/register')
    renderApp()

    await screen.findByRole('heading', { name: 'Регистрация' })
    fireEvent.change(screen.getByLabelText('Имя пользователя'), {
      target: { value: 'alice' },
    })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alice@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'secret123' },
    })
    fireEvent.change(screen.getByLabelText('Подтверждение пароля'), {
      target: { value: 'secret123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(await screen.findByRole('heading', { name: 'StudMarket' })).toBeInTheDocument()
    expect(await screen.findByText('alice')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Войти' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Зарегистрироваться' }),
    ).not.toBeInTheDocument()
  })
})