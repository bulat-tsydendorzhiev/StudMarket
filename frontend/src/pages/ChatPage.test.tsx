import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import ChatPage from './ChatPage'
import {
  authenticatedAuthRoutes,
  currentUser,
  renderWithProviders,
  stubFetch,
} from '../testHelpers'

const OTHER_USER_ID = 'user-other'

function renderChatPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<div>Home Page</div>} />
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
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /chat/conversations/conv-1/messages': { status: 200, body: [] },
    })
    renderChatPage()

    expect(screen.getByText('Загрузка…')).toBeInTheDocument()
    expect(await screen.findByText('Сообщений пока нет')).toBeInTheDocument()
  })

  it('shows messages with sender and timestamp', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
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
    })
    renderChatPage()

    expect(await screen.findByText('Здравствуйте!')).toBeInTheDocument()
    expect(screen.getByText('Привет!')).toBeInTheDocument()
    expect(screen.getAllByText('Собеседник').length).toBe(1)
    expect(screen.getAllByText('Вы').length).toBe(1)
  })

  it('distinguishes own and other messages visually', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
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
    })
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
      if (
        url.endsWith('/chat/conversations/conv-1/messages') &&
        method === 'POST'
      ) {
        postCalled = true
        return Promise.resolve(
          new Response(JSON.stringify(sentMessage), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      if (
        url.endsWith('/chat/conversations/conv-1/messages') &&
        method === 'GET'
      ) {
        return Promise.resolve(
          new Response(JSON.stringify(postCalled ? [sentMessage] : []), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      if (url.endsWith('/auth/me') && method === 'GET') {
        return Promise.resolve(
          new Response(JSON.stringify(currentUser), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      }
      return Promise.resolve(new Response(null, { status: 404 }))
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
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /chat/conversations/conv-1/messages': { status: 200, body: [] },
    })
    renderChatPage()

    await screen.findByText('Сообщений пока нет')
    expect(screen.getByRole('button', { name: 'Отправить' })).toBeDisabled()
  })
})
