import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RegisterPage from './RegisterPage'

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

function fillForm(overrides: Partial<Record<string, string>> = {}) {
  const values = {
    username: 'alice',
    email: 'alice@example.com',
    password: 'secret123',
    passwordConfirmation: 'secret123',
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

function mockRegisterResponse(status: number, body: unknown) {
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

describe('RegisterPage', () => {
  it('renders the registration form', () => {
    renderRegisterPage()

    expect(screen.getByRole('heading', { name: 'Регистрация' })).toBeInTheDocument()
    expect(screen.getByLabelText('Имя пользователя')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument()
    expect(screen.getByLabelText('Подтверждение пароля')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать аккаунт' })).toBeInTheDocument()
  })

  it('shows an error when passwords do not match and does not submit', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderRegisterPage()

    fillForm({ passwordConfirmation: 'different' })
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('redirects to the login page after successful registration', async () => {
    mockRegisterResponse(201, {
      id: 'uuid-1',
      username: 'alice',
      email: 'alice@example.com',
    })
    renderRegisterPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))

    expect(await screen.findByText('Login Page')).toBeInTheDocument()
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
})