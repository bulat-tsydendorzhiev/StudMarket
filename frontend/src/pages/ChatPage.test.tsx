import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import ChatPage from './ChatPage'
import {
  authenticatedAuthRoutes,
  currentUser,
  renderWithProviders,
  stubFetch,
  type MockRoutes,
} from '../testHelpers'

const OTHER_USER_ID = 'user-other'
const OTHER_USERNAME = 'bob'

function conversation() {
  return {
    id: 'conv-1',
    listing_id: 'listing-1',
    buyer_id: currentUser.id,
    seller_id: OTHER_USER_ID,
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
  }
}

function baseRoutes(overrides: Record<string, unknown> = {}): MockRoutes {
  return {
    ...authenticatedAuthRoutes(),
    'GET /chat/conversations/conv-1': { status: 200, body: conversation() },
    'GET /auth/users/user-other': {
      status: 200,
      body: { id: OTHER_USER_ID, username: OTHER_USERNAME },
    },
    ...overrides,
  }
}

function renderChatPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<div>Home Page</div>} />
      <Route path="/chat" element={<div>Chat List Page</div>} />
      <Route path="/chat/:conversationId" element={<ChatPage />} />
    </Routes>,
    ['/chat/conv-1'],
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChatPage', () => {
  it('shows a loading state while fetching messages', async () => {
    stubFetch(baseRoutes({ 'GET /chat/conversations/conv-1/messages': { status: 200, body: [] } }))
    renderChatPage()

    expect(screen.getByText('Загрузка…')).toBeInTheDocument()
    expect(await screen.findByText('Сообщений пока нет')).toBeInTheDocument()
  })

  it('shows the back link to the chat list', async () => {
    stubFetch(baseRoutes({ 'GET /chat/conversations/conv-1/messages': { status: 200, body: [] } }))
    renderChatPage()

    expect(
      await screen.findByRole('link', { name: /Назад/ }),
    ).toHaveAttribute('href', '/chat')
  })

  it('shows the peer nickname in the header', async () => {
    stubFetch(baseRoutes({ 'GET /chat/conversations/conv-1/messages': { status: 200, body: [] } }))
    renderChatPage()

    expect(
      await screen.findByText(new RegExp(OTHER_USERNAME)),
    ).toBeInTheDocument()
  })

  it('shows messages with sender nickname and timestamp', async () => {
    stubFetch(
      baseRoutes({
        'GET /chat/conversations/conv-1/messages': {
          status: 200,
          body: [
            {
              id: 'msg-1',
              conversation_id: 'conv-1',
              sender_id: OTHER_USER_ID,
              text: 'Здравствуйте!',
              created_at: '2026-09-05T10:00:00Z',
              read_at: null,
            },
            {
              id: 'msg-2',
              conversation_id: 'conv-1',
              sender_id: currentUser.id,
              text: 'Привет!',
              created_at: '2026-09-05T10:05:00Z',
              read_at: null,
            },
          ],
        },
      }),
    )
    renderChatPage()

    expect(await screen.findByText('Здравствуйте!')).toBeInTheDocument()
    expect(screen.getByText('Привет!')).toBeInTheDocument()
    expect(
      (await screen.findAllByText(OTHER_USERNAME)).length,
    ).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Вы').length).toBe(1)
  })

  it('renders message text as markdown', async () => {
    stubFetch(
      baseRoutes({
        'GET /chat/conversations/conv-1/messages': {
          status: 200,
          body: [
            {
              id: 'msg-1',
              conversation_id: 'conv-1',
              sender_id: OTHER_USER_ID,
              text: 'Почти **новый** велосипед',
              created_at: '2026-09-05T10:00:00Z',
              read_at: null,
            },
          ],
        },
      }),
    )
    renderChatPage()

    const strong = await screen.findByText('новый')
    expect(strong.tagName).toBe('STRONG')
  })

  it('distinguishes own and other messages visually', async () => {
    stubFetch(
      baseRoutes({
        'GET /chat/conversations/conv-1/messages': {
          status: 200,
          body: [
            {
              id: 'msg-1',
              conversation_id: 'conv-1',
              sender_id: OTHER_USER_ID,
              text: 'Здравствуйте!',
              created_at: '2026-09-05T10:00:00Z',
              read_at: null,
            },
            {
              id: 'msg-2',
              conversation_id: 'conv-1',
              sender_id: currentUser.id,
              text: 'Привет!',
              created_at: '2026-09-05T10:05:00Z',
              read_at: null,
            },
          ],
        },
      }),
    )
    renderChatPage()

    const mineText = await screen.findByText('Привет!')
    const mine = mineText.closest('.chat__message')
    const other = screen.getByText('Здравствуйте!').closest('.chat__message')

    expect(mine).toHaveClass('chat__message--mine')
    expect(other).toHaveClass('chat__message--other')
  })

  it('sends a message and refreshes the list', async () => {
    const sentMessage = {
      id: 'msg-3',
      conversation_id: 'conv-1',
      sender_id: currentUser.id,
      text: 'Как дела?',
      created_at: '2026-09-05T10:10:00Z',
      read_at: null,
    }
    let postCalled = false
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      const respond = (status: number, body?: unknown) =>
        Promise.resolve(
          new Response(body === undefined ? null : JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      if (url.endsWith('/chat/conversations/conv-1/messages') && method === 'POST') {
        postCalled = true
        return respond(201, sentMessage)
      }
      if (url.endsWith('/chat/conversations/conv-1/messages') && method === 'GET') {
        return respond(200, postCalled ? [sentMessage] : [])
      }
      if (url.endsWith('/chat/conversations/conv-1') && method === 'GET') {
        return respond(200, conversation())
      }
      if (url.endsWith('/auth/users/user-other') && method === 'GET') {
        return respond(200, { id: OTHER_USER_ID, username: OTHER_USERNAME })
      }
      if (url.endsWith('/auth/me') && method === 'GET') {
        return respond(200, currentUser)
      }
      return respond(404)
    })
    vi.stubGlobal('fetch', fetchMock)

    renderChatPage()

    expect(await screen.findByText('Сообщений пока нет')).toBeInTheDocument()

    const input = screen.getByLabelText('Сообщение')
    fireEvent.change(input, { target: { value: 'Как дела?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }))

    expect(await screen.findByText('Как дела?')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(
        ([inputUrl, init]) =>
          String(inputUrl).endsWith('/chat/conversations/conv-1/messages') &&
          (init?.method ?? 'GET') === 'POST',
      ),
    ).toBe(true)
  })

  it('keeps the send button disabled for empty input', async () => {
    stubFetch(baseRoutes({ 'GET /chat/conversations/conv-1/messages': { status: 200, body: [] } }))
    renderChatPage()

    await screen.findByText('Сообщений пока нет')
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled()
  })
})