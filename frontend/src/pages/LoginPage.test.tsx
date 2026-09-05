import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LoginPage from './LoginPage'

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
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

function mockLoginResponse(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LoginPage', () => {
  it('renders the login form', () => {
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
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderLoginPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }))
    await screen.findByText('Home Page')

    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.credentials).toBe('include')
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