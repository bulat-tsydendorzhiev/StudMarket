import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import UserAvatar, { avatarSrc } from './UserAvatar'
import { authenticatedAuthRoutes, renderWithProviders, stubFetch } from '../testHelpers'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('avatarSrc', () => {
  it('falls back to the default fox avatar when avatar_path is null', () => {
    expect(avatarSrc(null)).toBe('/avatars/fox.png')
  })

  it('returns the preset path when set', () => {
    expect(avatarSrc('/avatars/owl.png')).toBe('/avatars/owl.png')
  })
})

describe('UserAvatar', () => {
  it('opens a menu with profile edit and logout options when clicked', async () => {
    stubFetch(authenticatedAuthRoutes())
    renderWithProviders(<UserAvatar />)

    const button = await screen.findByRole('button', { name: 'Профиль' })
    expect(button).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(button)

    expect(
      await screen.findByRole('menuitem', { name: 'Редактировать профиль' }),
    ).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('menuitem', { name: 'Выйти' })).toBeInTheDocument()
  })

  it('shows the default avatar when the user has no avatar', async () => {
    stubFetch(authenticatedAuthRoutes())
    renderWithProviders(<UserAvatar />)

    const img = await screen.findByAltText('Аватар')
    expect(img).toHaveAttribute('src', '/avatars/fox.png')
  })

  it('shows the chosen preset avatar', async () => {
    stubFetch({
      'GET /auth/me': {
        status: 200,
        body: {
          id: 'user-1',
          username: 'alice',
          email: 'alice@example.com',
          avatar_path: '/avatars/cat.png',
        },
      },
    })
    renderWithProviders(<UserAvatar />)

    const img = await screen.findByAltText('Аватар')
    expect(img).toHaveAttribute('src', '/avatars/cat.png')
  })

  it('closes the menu when clicking outside', async () => {
    stubFetch(authenticatedAuthRoutes())
    renderWithProviders(<UserAvatar />)

    const button = await screen.findByRole('button', { name: 'Профиль' })
    fireEvent.click(button)
    expect(await screen.findByRole('menu')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders nothing for guests', async () => {
    stubFetch({ 'GET /auth/me': { status: 401, body: { detail: 'Не авторизован' } } })
    const { container } = renderWithProviders(<UserAvatar />)

    await Promise.resolve()
    expect(container.querySelector('button')).toBeNull()
  })
})