import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext'
import LoginPage from './LoginPage'

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

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

function fillForm(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    usernameOrEmail: 'alice',
    password: 'secret123',
    ...overrides,
  }

  fireEvent.change(screen.getByLabelText('Имя пользователя или email'), {
    target: { value: values.usernameOrEmail },
  })
  fireEvent.change(screen.getByLabelText('Пароль'), {
    target: { value: values.password },
  })
}

const guestRoutes = (): MockRoutes => ({
  'GET /auth/me': { status: 401, body: { detail: 'Не авторизован' } },
})

function mockLoginResponse(status: number, body: unknown) {
  return stubFetch({ ...guestRoutes(), 'POST /auth/login': { status, body } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LoginPage', () => {
  it('renders the login form', () => {
    stubFetch(guestRoutes())
    renderLoginPage()

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
    expect(screen.getByLabelText('Имя пользователя или email')).toBeInTheDocument()
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
  })

  it('redirects to the home page after successful login', async () => {
    mockLoginResponse(200, {
      id: 'uuid-1',
      username: 'alice',
      email: 'alice@example.com',
    })
    renderLoginPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByText('Home Page')).toBeInTheDocument()
  })

  it('sends credentials so the auth cookie is included', async () => {
    const fetchMock = stubFetch({
      ...guestRoutes(),
      'POST /auth/login': {
        status: 200,
        body: { id: 'uuid-1', username: 'alice', email: 'alice@example.com' },
      },
    })
    renderLoginPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))
    await screen.findByText('Home Page')

    const loginCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/auth/login'),
    )
    expect(loginCall?.[1]?.credentials).toBe('include')
  })

  it('shows an API error for invalid credentials', async () => {
    mockLoginResponse(401, { detail: 'Неверное имя пользователя или пароль' })
    renderLoginPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    expect(
      await screen.findByText('Неверное имя пользователя или пароль'),
    ).toBeInTheDocument()
  })

  it('maps server field validation errors to the inputs', async () => {
    mockLoginResponse(422, {
      detail: [
        {
          loc: ['body', 'password'],
          msg: 'password is required',
          type: 'value_error',
        },
      ],
    })
    renderLoginPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByText('password is required')).toBeInTheDocument()
  })
})