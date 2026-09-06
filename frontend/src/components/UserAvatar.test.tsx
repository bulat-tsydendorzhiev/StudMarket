import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
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
  it('links to the profile page', async () => {
    stubFetch(authenticatedAuthRoutes())
    renderWithProviders(<UserAvatar />)

    const link = await screen.findByRole('link', { name: 'Профиль' })
    expect(link).toHaveAttribute('href', '/profile')
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

  it('renders nothing for guests', async () => {
    stubFetch({ 'GET /auth/me': { status: 401, body: { detail: 'Не авторизован' } } })
    const { container } = renderWithProviders(<UserAvatar />)

    await Promise.resolve()
    expect(container.querySelector('a')).toBeNull()
  })
})