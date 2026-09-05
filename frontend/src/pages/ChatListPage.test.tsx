import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import ChatListPage from './ChatListPage'
import {
  authenticatedAuthRoutes,
  renderWithProviders,
  stubFetch,
  type MockRoutes,
} from '../testHelpers'

function conversation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'conv-1',
    listing_id: 'listing-1',
    listing_title: 'Велосипед',
    buyer_id: 'user-buyer',
    seller_id: 'user-1',
    last_message: null,
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
    ...overrides,
  }
}

function baseRoutes(overrides: Record<string, unknown> = {}): MockRoutes {
  return {
    ...authenticatedAuthRoutes(),
    'GET /auth/users/user-buyer': {
      status: 200,
      body: { id: 'user-buyer', username: 'bob' },
    },
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
    stubFetch(baseRoutes({ 'GET /chat/conversations': { status: 200, body: [] } }))
    renderChatListPage()

    expect(screen.getByText('Загрузка…')).toBeInTheDocument()
    expect(await screen.findByText('Чатов пока нет')).toBeInTheDocument()
  })

  it('shows the empty state when there are no conversations', async () => {
    stubFetch(baseRoutes({ 'GET /chat/conversations': { status: 200, body: [] } }))
    renderChatListPage()

    expect(await screen.findByText('Чатов пока нет')).toBeInTheDocument()
  })

  it('renders the interlocutor nickname with the last message', async () => {
    stubFetch(
      baseRoutes({
        'GET /chat/conversations': {
          status: 200,
          body: [
            conversation({ id: 'conv-1', last_message: 'Здравствуйте!' }),
            conversation({
              id: 'conv-2',
              buyer_id: 'user-1',
              seller_id: 'user-seller',
              last_message: null,
            }),
          ],
        },
        'GET /auth/users/user-seller': {
          status: 200,
          body: { id: 'user-seller', username: 'alice' },
        },
      }),
    )
    renderChatListPage()

    expect(await screen.findByText('bob')).toBeInTheDocument()
    expect(await screen.findByText('alice')).toBeInTheDocument()
    expect(screen.getByText('Здравствуйте!')).toBeInTheDocument()
    expect(screen.getAllByText('Сообщений пока нет').length).toBe(1)

    const first = screen.getByRole('link', { name: /bob/ })
    expect(first).toHaveAttribute('href', '/chat/conv-1')
    const second = screen.getByRole('link', { name: /alice/ })
    expect(second).toHaveAttribute('href', '/chat/conv-2')
  })

  it('shows an error state when conversations fail to load', async () => {
    stubFetch(
      baseRoutes({ 'GET /chat/conversations': { status: 500, body: { detail: 'boom' } } }),
    )
    renderChatListPage()

    expect(
      await screen.findByText('Не удалось загрузить чаты'),
    ).toBeInTheDocument()
  })
})