import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import MessagesLink from './MessagesLink'
import {
  authenticatedAuthRoutes,
  guestAuthRoutes,
  renderWithProviders,
  stubFetch,
} from '../testHelpers'

function conversation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-1',
    listing_id: 'listing-1',
    listing_title: 'Велосипед',
    buyer_id: 'user-buyer',
    seller_id: 'user-1',
    other_user: 'user-buyer',
    last_message: 'Привет',
    last_message_at: '2026-09-05T10:00:00Z',
    unread_count: 0,
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MessagesLink', () => {
  it('renders nothing for guests', async () => {
    stubFetch(guestAuthRoutes())
    renderWithProviders(<MessagesLink />)

    expect(
      screen.queryByRole('link', { name: 'Чаты' }),
    ).not.toBeInTheDocument()
  })

  it('renders the messages icon linking to /chat', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /chat/conversations': { status: 200, body: [] },
    })
    renderWithProviders(<MessagesLink />)

    const link = await screen.findByRole('link', { name: 'Чаты' })
    expect(link).toHaveAttribute('href', '/chat')
    expect(screen.queryByText('💬')).toBeInTheDocument()
    expect(document.querySelector('.messages-link__dot')).not.toBeInTheDocument()
  })

  it('shows no dot when there are no unread messages', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /chat/conversations': {
        status: 200,
        body: [conversation({ unread_count: 0 })],
      },
    })
    renderWithProviders(<MessagesLink />)

    await screen.findByRole('link', { name: 'Чаты' })
    expect(document.querySelector('.messages-link__dot')).not.toBeInTheDocument()
  })

  it('shows a red dot when there are unread messages', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /chat/conversations': {
        status: 200,
        body: [
          conversation({ unread_count: 2 }),
          conversation({ id: 'conv-2', unread_count: 1 }),
        ],
      },
    })
    renderWithProviders(<MessagesLink />)

    await screen.findByRole('link', { name: 'Чаты' })
    await waitFor(() =>
      expect(document.querySelector('.messages-link__dot')).toBeInTheDocument(),
    )
  })
})