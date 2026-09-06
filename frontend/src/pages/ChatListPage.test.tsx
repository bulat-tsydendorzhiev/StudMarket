import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import ChatListPage from './ChatListPage'
import {
  authenticatedAuthRoutes,
  makeImage,
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
    other_user: 'user-buyer',
    last_message: null,
    last_message_at: null,
    unread_count: 0,
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
    ...overrides,
  }
}

function listingRoutes(): MockRoutes {
  return {
    'GET /listings/listing-1': {
      status: 200,
      body: {
        id: 'listing-1',
        seller_id: 'user-1',
        title: 'Велосипед',
        description: 'Почти новый велосипед',
        price: 1500,
        status: 'active',
        created_at: '2026-09-05T00:00:00Z',
        updated_at: '2026-09-05T00:00:00Z',
        expires_at: null,
        location: null,
        tags: [],
        images: [makeImage()],
      },
    },
  }
}

function baseRoutes(overrides: MockRoutes = {}): MockRoutes {
  return {
    ...authenticatedAuthRoutes(),
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

  it('renders the listing title with the last message and its time', async () => {
    const TS = '2026-01-01T10:00:00Z'
    const expected = new Date(TS).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'numeric',
    })
    stubFetch(
      baseRoutes({
        'GET /chat/conversations': {
          status: 200,
          body: [
            conversation({ last_message: 'Здравствуйте!', last_message_at: TS }),
          ],
        },
      }),
    )
    renderChatListPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.getByText('Здравствуйте!')).toBeInTheDocument()
    expect(screen.getByText(expected)).toBeInTheDocument()

    const row = screen.getByRole('link', { name: /Велосипед/ })
    expect(row).toHaveAttribute('href', '/chat/conv-1')
  })

  it('shows a photo placeholder when the listing has no image', async () => {
    stubFetch(
      baseRoutes({
        'GET /chat/conversations': {
          status: 200,
          body: [conversation()],
        },
      }),
    )
    renderChatListPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(
      document.querySelector('.chat-list__photo-placeholder'),
    ).toBeInTheDocument()
  })

  it('shows the listing photo on the left', async () => {
    stubFetch(
      baseRoutes({
        'GET /chat/conversations': {
          status: 200,
          body: [conversation()],
        },
        ...listingRoutes(),
      }),
    )
    renderChatListPage()

    const img = await screen.findByAltText('Велосипед')
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('/listings/listing-1/images/image-1'),
    )
    expect(
      document.querySelector('.chat-list__photo-img'),
    ).toBeInTheDocument()
  })

  it('shows plain red dots for unread conversations without numbers', async () => {
    stubFetch(
      baseRoutes({
        'GET /chat/conversations': {
          status: 200,
          body: [
            conversation({ unread_count: 2 }),
            conversation({ id: 'conv-2', unread_count: 0 }),
          ],
        },
      }),
    )
    renderChatListPage()

    const titles = await screen.findAllByText('Велосипед')
    expect(titles.length).toBe(2)
    expect(document.querySelectorAll('.chat-list__dot').length).toBe(1)
    expect(screen.queryByText('2')).not.toBeInTheDocument()
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