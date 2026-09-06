import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import ProfilePage from './ProfilePage'
import { authenticatedAuthRoutes, renderWithProviders, stubFetch } from '../testHelpers'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ProfilePage', () => {
  it('renders the current user profile data', async () => {
    stubFetch(authenticatedAuthRoutes())
    renderWithProviders(<ProfilePage />)

    expect(await screen.findByRole('heading', { name: 'Профиль' })).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByLabelText('Имя пользователя')).toHaveValue('alice')
    expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com')
  })

  it('shows the default avatar when none is chosen', async () => {
    stubFetch(authenticatedAuthRoutes())
    renderWithProviders(<ProfilePage />)

    await screen.findByRole('heading', { name: 'Профиль' })
    const avatars = screen.getAllByAltText('Аватар')
    expect(avatars.length).toBeGreaterThan(0)
  })

  it('updates the username', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      'PATCH /auth/profile': {
        status: 200,
        body: {
          id: 'user-1',
          username: 'renamed',
          email: 'alice@example.com',
          avatar_path: null,
        },
      },
    })
    renderWithProviders(<ProfilePage />)

    await screen.findByRole('heading', { name: 'Профиль' })
    fireEvent.change(screen.getByLabelText('Имя пользователя'), {
      target: { value: 'renamed' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Профиль обновлён')).toBeInTheDocument()
    expect(screen.getByText('renamed')).toBeInTheDocument()
    const patchCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).endsWith('/auth/profile') && (init?.method ?? 'GET') === 'PATCH',
    )
    expect(patchCall).toBeTruthy()
    expect((patchCall?.[1] as RequestInit).body).toContain('"username":"renamed"')
  })

  it('updates the email', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'PATCH /auth/profile': {
        status: 200,
        body: {
          id: 'user-1',
          username: 'alice',
          email: 'new@example.com',
          avatar_path: null,
        },
      },
    })
    renderWithProviders(<ProfilePage />)

    await screen.findByRole('heading', { name: 'Профиль' })
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'new@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Профиль обновлён')).toBeInTheDocument()
    expect(screen.getByText('new@example.com')).toBeInTheDocument()
  })

  it('sends current and new password when changing the password', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      'PATCH /auth/profile': {
        status: 200,
        body: {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          avatar_path: null,
        },
      },
    })
    renderWithProviders(<ProfilePage />)

    await screen.findByRole('heading', { name: 'Профиль' })
    fireEvent.change(screen.getByLabelText('Текущий пароль'), {
      target: { value: 'secret123' },
    })
    fireEvent.change(screen.getByLabelText('Новый пароль'), {
      target: { value: 'newpass456' },
    })
    fireEvent.change(screen.getByLabelText('Подтверждение нового пароля'), {
      target: { value: 'newpass456' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Профиль обновлён')).toBeInTheDocument()
    const patchCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).endsWith('/auth/profile') && (init?.method ?? 'GET') === 'PATCH',
    )
    expect(patchCall).toBeTruthy()
    const body = (patchCall?.[1] as RequestInit).body as string
    expect(body).toContain('"current_password":"secret123"')
    expect(body).toContain('"new_password":"newpass456"')
  })

  it('rejects password change when passwords do not match', async () => {
    const fetchMock = stubFetch(authenticatedAuthRoutes())
    renderWithProviders(<ProfilePage />)

    await screen.findByRole('heading', { name: 'Профиль' })
    fireEvent.change(screen.getByLabelText('Текущий пароль'), {
      target: { value: 'secret123' },
    })
    fireEvent.change(screen.getByLabelText('Новый пароль'), {
      target: { value: 'newpass456' },
    })
    fireEvent.change(screen.getByLabelText('Подтверждение нового пароля'), {
      target: { value: 'different999' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Пароли не совпадают')).toBeInTheDocument()
    const patchCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).endsWith('/auth/profile') && (init?.method ?? 'GET') === 'PATCH',
    )
    expect(patchCall).toBeFalsy()
  })

  it('shows an error when the current password is wrong', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'PATCH /auth/profile': { status: 400, body: { detail: 'Неверный текущий пароль' } },
    })
    renderWithProviders(<ProfilePage />)

    await screen.findByRole('heading', { name: 'Профиль' })
    fireEvent.change(screen.getByLabelText('Текущий пароль'), {
      target: { value: 'wrongpw' },
    })
    fireEvent.change(screen.getByLabelText('Новый пароль'), {
      target: { value: 'newpass456' },
    })
    fireEvent.change(screen.getByLabelText('Подтверждение нового пароля'), {
      target: { value: 'newpass456' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Неверный текущий пароль')).toBeInTheDocument()
  })

  it('shows a conflict error for a taken username', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'PATCH /auth/profile': { status: 409, body: { detail: 'Имя пользователя уже занято' } },
    })
    renderWithProviders(<ProfilePage />)

    await screen.findByRole('heading', { name: 'Профиль' })
    fireEvent.change(screen.getByLabelText('Имя пользователя'), {
      target: { value: 'bob' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Имя пользователя уже занято')).toBeInTheDocument()
  })

  it('changes the avatar to a preset and reflects it immediately', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'PATCH /auth/profile': {
        status: 200,
        body: {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          avatar_path: '/avatars/owl.png',
        },
      },
    })
    renderWithProviders(<ProfilePage />)

    await screen.findByRole('heading', { name: 'Профиль' })
    fireEvent.click(screen.getByAltText('Сова'))
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Профиль обновлён')).toBeInTheDocument()
    expect(
      screen.getAllByAltText('Сова').some((img) => img.getAttribute('src') === '/avatars/owl.png'),
    ).toBe(true)
  })

  it('does not submit when nothing is changed', async () => {
    const fetchMock = stubFetch(authenticatedAuthRoutes())
    renderWithProviders(<ProfilePage />)

    await screen.findByRole('heading', { name: 'Профиль' })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    const patchCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).endsWith('/auth/profile') && (init?.method ?? 'GET') === 'PATCH',
    )
    expect(patchCall).toBeFalsy()
  })
})