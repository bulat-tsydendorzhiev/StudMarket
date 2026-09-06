import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthContext'
import RegisterPage from './RegisterPage'

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

function renderRegisterPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

function fillForm(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    username: 'alice',
    email: 'alice@example.com',
    password: 'Secret123',
    passwordConfirmation: 'Secret123',
    ...overrides,
  }

  fireEvent.change(screen.getByLabelText('Имя пользователя'), {
    target: { value: values.username },
  })
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: values.email },
  })
  fireEvent.change(screen.getByLabelText('Пароль'), {
    target: { value: values.password },
  })
  fireEvent.change(screen.getByLabelText('Подтверждение пароля'), {
    target: { value: values.passwordConfirmation },
  })
}

const guestRoutes = (): MockRoutes => ({
  'GET /auth/me': { status: 401, body: { detail: 'Не авторизован' } },
})

function mockRegisterResponse(status: number, body: unknown) {
  return stubFetch({ ...guestRoutes(), 'POST /auth/register': { status, body } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RegisterPage', () => {
  it('renders the registration form', () => {
    stubFetch(guestRoutes())
    renderRegisterPage()

    expect(screen.getByRole('heading', { name: 'Регистрация' })).toBeInTheDocument()
    expect(screen.getByLabelText('Имя пользователя')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument()
    expect(screen.getByLabelText('Подтверждение пароля')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать аккаунт' })).toBeInTheDocument()
  })

  it('shows an error when passwords do not match and does not submit', async () => {
    const fetchMock = stubFetch(guestRoutes())
    renderRegisterPage()

    fillForm({ passwordConfirmation: 'different' })
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith('/auth/register')),
    ).toBe(false)
  })

  it('redirects to the home page after successful registration', async () => {
    mockRegisterResponse(201, {
      id: 'uuid-1',
      username: 'alice',
      email: 'alice@example.com',
    })
    renderRegisterPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(await screen.findByText('Home Page')).toBeInTheDocument()
  })

  it('shows API errors returned by the server', async () => {
    mockRegisterResponse(409, { detail: 'Имя пользователя уже занято' })
    renderRegisterPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(await screen.findByText('Имя пользователя уже занято')).toBeInTheDocument()
  })

  it('maps server field validation errors to the inputs', async () => {
    mockRegisterResponse(422, {
      detail: [
        {
          loc: ['body', 'email'],
          msg: 'value is not a valid email address',
          type: 'value_error',
        },
      ],
    })
    renderRegisterPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(
      await screen.findByText('value is not a valid email address'),
    ).toBeInTheDocument()
  })

  it('toggles password visibility with the eye buttons', () => {
    stubFetch(guestRoutes())
    renderRegisterPage()

    const passwordInput = screen.getByLabelText('Пароль') as HTMLInputElement
    const confirmationInput = screen.getByLabelText(
      'Подтверждение пароля',
    ) as HTMLInputElement

    expect(passwordInput.type).toBe('password')
    expect(confirmationInput.type).toBe('password')

    fireEvent.click(screen.getByRole('button', { name: 'Показать пароль' }))

    expect(passwordInput.type).toBe('text')
    expect(confirmationInput.type).toBe('password')

    fireEvent.click(
      screen.getByRole('button', { name: 'Показать подтверждение пароля' }),
    )

    expect(passwordInput.type).toBe('text')
    expect(confirmationInput.type).toBe('text')

    fireEvent.click(screen.getByRole('button', { name: 'Скрыть пароль' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Скрыть подтверждение пароля' }),
    )

    expect(passwordInput.type).toBe('password')
    expect(confirmationInput.type).toBe('password')
  })

  it('shows password strength hints for a weak password', () => {
    stubFetch(guestRoutes())
    renderRegisterPage()

    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'weak' },
    })

    expect(screen.getByText(/минимум 8 символов/)).toBeInTheDocument()
    expect(screen.getByText(/заглавная буква/)).toBeInTheDocument()
    expect(screen.getByText(/цифра/)).toBeInTheDocument()
    expect(screen.queryByText(/Пароль достаточно надёжный/)).not.toBeInTheDocument()
  })

  it('shows a success hint when the password is strong enough', () => {
    stubFetch(guestRoutes())
    renderRegisterPage()

    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'Secret123' },
    })

    expect(screen.getByText('Пароль достаточно надёжный')).toBeInTheDocument()
  })

  it('blocks submission with a weak password', async () => {
    const fetchMock = stubFetch(guestRoutes())
    renderRegisterPage()

    fillForm({ password: 'weak', passwordConfirmation: 'weak' })
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(await screen.findByText('Пароль слишком слабый')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith('/auth/register')),
    ).toBe(false)
  })
})