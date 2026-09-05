import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import ChatListPage from './ChatListPage'
import {
  authenticatedAuthRoutes,
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
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
    ...overrides,
  }
}

function renderChatListPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<div>Home Page</div>} />
      <Route path="/chat" element={<ChatListPage />} />
      <Route path="/chat/:conversationId" element={<div>Chat Page</div>} />
    </Routes>,
    ['/chat'],
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChatListPage', () => {
  it('shows a loading state while fetching conversations', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /chat/conversations': { status: 200, body: [] },
    })
    renderChatListPage()

    expect(screen.getByText('Загрузка…')).toBeInTheDocument()
    expect(await screen.findByText('Чатов пока нет')).toBeInTheDocument()
  })

  it('shows the empty state when there are no conversations', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /chat/conversations': { status: 200, body: [] },
    })
    renderChatListPage()

    expect(await screen.findByText('Чатов пока нет')).toBeInTheDocument()
  })

  it('renders conversations with listing title and role', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /chat/conversations': {
        status: 200,
        body: [
          conversation({ id: 'conv-1' }),
          conversation({
            id: 'conv-2',
            buyer_id: 'user-1',
            seller_id: 'user-seller',
            listing_title: 'Учебник',
          }),
        ],
      },
    })
    renderChatListPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.getByText('Учебник')).toBeInTheDocument()
    expect(screen.getAllByText('Вы продавец').length).toBe(1)
    expect(screen.getAllByText('Вы покупатель').length).toBe(1)

    const first = screen.getByRole('link', { name: /Велосипед/ })
    expect(first).toHaveAttribute('href', '/chat/conv-1')
    const second = screen.getByRole('link', { name: /Учебник/ })
    expect(second).toHaveAttribute('href', '/chat/conv-2')
  })

  it('shows an error state when conversations fail to load', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /chat/conversations': { status: 500, body: { detail: 'boom' } },
    })
    renderChatListPage()

    expect(
      await screen.findByText('Не удалось загрузить чаты'),
    ).toBeInTheDocument()
  })
})