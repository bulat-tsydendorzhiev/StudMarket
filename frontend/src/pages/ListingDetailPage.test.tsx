import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import ListingDetailPage from './ListingDetailPage'
import ChatPage from './ChatPage'
import {
  authenticatedAuthRoutes,
  currentUser,
  guestAuthRoutes,
  makeImage,
  makeListing,
  renderWithProviders,
  stubFetch,
} from '../testHelpers'

function renderDetailPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<div>Home Page</div>} />
      <Route path="/listings/:id" element={<ListingDetailPage />} />
      <Route path="/chat/:conversationId" element={<ChatPage />} />
    </Routes>,
    ['/listings/listing-1'],
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ListingDetailPage', () => {
  it('shows listing details for guests', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': { status: 200, body: makeListing() },
    })
    renderDetailPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.getByText('1500 ₽')).toBeInTheDocument()
    expect(screen.getByText('Почти новый велосипед')).toBeInTheDocument()
    expect(screen.queryByText(/Продавец/)).not.toBeInTheDocument()
    expect(screen.queryByText(/ID продавца/)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Редактировать' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
  })

  it('renders the description as Markdown', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({
          description: '# Характеристики\n\nПочти **новый** велосипед',
        }),
      },
    })
    renderDetailPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Характеристики' }),
    ).toBeInTheDocument()
    const strong = screen.getByText('новый')
    expect(strong.tagName).toBe('STRONG')
  })

  it('shows "Бесплатно" for a free listing', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ title: 'Отдам даром', price: 0 }),
      },
    })
    renderDetailPage()

    expect(await screen.findByText('Отдам даром')).toBeInTheDocument()
    expect(screen.getByText('Бесплатно')).toBeInTheDocument()
  })

  it('shows the remaining days until expiration for guests', async () => {
    const expiresAt = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString()
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ expires_at: expiresAt }),
      },
    })
    renderDetailPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.getByText('Осталось 6 дней')).toBeInTheDocument()
  })

  it('pluralizes the remaining days correctly', async () => {
    const expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ expires_at: expiresAt }),
      },
    })
    renderDetailPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.getByText('Осталось 1 день')).toBeInTheDocument()
  })

  it('hides the expiration block for expired listings', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ status: 'EXPIRED' }),
      },
    })
    renderDetailPage()

    expect(await screen.findByText('Объявление истекло')).toBeInTheDocument()
    expect(screen.queryByText(/Осталось/)).not.toBeInTheDocument()
  })

  it('shows the tags of the listing', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ tags: ['Электроника', 'Спорт'] }),
      },
    })
    renderDetailPage()

    expect(await screen.findByText('Электроника')).toBeInTheDocument()
    expect(screen.getByText('Спорт')).toBeInTheDocument()
  })

  it('shows the location of the listing', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ location: 'Общежитие №3' }),
      },
    })
    renderDetailPage()

    expect(await screen.findByText('Общежитие №3')).toBeInTheDocument()
    expect(screen.getByText('Локация')).toBeInTheDocument()
  })

  it('does not show location section when absent', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': { status: 200, body: makeListing() },
    })
    renderDetailPage()

    await screen.findByText('Велосипед')
    expect(screen.queryByText('Локация')).not.toBeInTheDocument()
  })

  it('shows edit and delete controls for the owner', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': { status: 200, body: makeListing() },
    })
    renderDetailPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Редактировать' })).toHaveAttribute(
      'href',
      '/listings/listing-1/edit',
    )
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument()
  })

  it('does not show edit controls for listings owned by someone else', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ seller_id: 'some-other-user' }),
      },
    })
    renderDetailPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Редактировать' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Удалить' })).not.toBeInTheDocument()
  })

  it('deletes the listing and returns to the home page', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': { status: 200, body: makeListing() },
      'DELETE /listings/listing-1': { status: 204 },
    })
    renderDetailPage()

    const deleteButton = await screen.findByRole('button', { name: 'Удалить' })
    fireEvent.click(deleteButton)

    expect(await screen.findByText('Home Page')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          String(input).endsWith('/listings/listing-1') &&
          (init?.method ?? 'GET') === 'DELETE',
      ),
    ).toBe(true)
  })

  it('shows a message when the listing is missing', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': { status: 404, body: { detail: 'Объявление не найдено' } },
    })
    renderDetailPage()

    expect(
      await screen.findByText('Объявление не найдено'),
    ).toBeInTheDocument()
  })

  it('shows an expired state and hides chat button for expired listings', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({
          status: 'EXPIRED',
          seller_id: 'some-other-user',
        }),
      },
    })
    renderDetailPage()

    expect(await screen.findByText('Объявление истекло')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Написать продавцу' }),
    ).not.toBeInTheDocument()
  })

  it('shows "Написать продавцу" for an authenticated buyer', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ seller_id: 'some-other-user' }),
      },
    })
    renderDetailPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Написать продавцу' }),
    ).toBeInTheDocument()
  })

  it('creates a conversation and navigates to the chat when "Написать продавцу" is clicked', async () => {
    const conversation = {
      id: 'conv-1',
      listing_id: 'listing-1',
      buyer_id: currentUser.id,
      seller_id: 'some-other-user',
      created_at: '2026-09-05T00:00:00Z',
      updated_at: '2026-09-05T00:00:00Z',
    }
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ seller_id: 'some-other-user' }),
      },
      'POST /chat/conversations': { status: 201, body: conversation },
      'GET /chat/conversations/conv-1': { status: 200, body: conversation },
      'GET /auth/users/some-other-user': {
        status: 200,
        body: { id: 'some-other-user', username: 'bob' },
      },
      'GET /chat/conversations/conv-1/messages': { status: 200, body: [] },
    })
    renderDetailPage()

    const chatButton = await screen.findByRole('button', { name: 'Написать продавцу' })
    fireEvent.click(chatButton)

    expect(await screen.findByText('Сообщений пока нет')).toBeInTheDocument()

    const postCall = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).endsWith('/chat/conversations') &&
        (init?.method ?? 'GET') === 'POST',
    )
    expect(postCall).toBeTruthy()
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      listing_id: 'listing-1',
    })
  })

  it('does not show "Написать продавцу" for the owner', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': { status: 200, body: makeListing() },
    })
    renderDetailPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Написать продавцу' }),
    ).not.toBeInTheDocument()
  })

  it('does not show "Написать продавцу" for guests', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ seller_id: 'some-other-user' }),
      },
    })
    renderDetailPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Написать продавцу' }),
    ).not.toBeInTheDocument()
  })

  it('shows photos waiting message when there are no images', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': { status: 200, body: makeListing() },
    })
    renderDetailPage()

    expect(
      await screen.findByText('Без фото'),
    ).toBeInTheDocument()
  })

  it('displays images and the first image as primary', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({
          images: [makeImage({ id: 'img-1' }), makeImage({ id: 'img-2', position: 1 })],
        }),
      },
    })
    renderDetailPage()

    expect(
      await screen.findByAltText('Фото объявления'),
    ).toBeInTheDocument()
    expect(screen.getAllByAltText('Миниатюра фото')).toHaveLength(2)
  })

  it('does not show image controls to non-owners', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({
          seller_id: 'some-other-user',
          images: [makeImage()],
        }),
      },
    })
    renderDetailPage()

    expect(
      await screen.findByAltText('Фото объявления'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Добавить фотографии' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Добавить фото' }),
    ).not.toBeInTheDocument()
  })

  it('allows the owner to add photos', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': { status: 200, body: makeListing() },
      'POST /listings/listing-1/images': {
        status: 201,
        body: [makeImage()],
      },
    })
    renderDetailPage()

    const addButton = await screen.findByRole('button', {
      name: 'Добавить фотографии',
    })
    const fileInput = addButton.parentElement?.querySelector(
      'input[type=file]',
    )
    fireEvent.change(fileInput!, {
      target: { files: [new File(['fake-jpeg'], 'photo.jpg', { type: 'image/jpeg' })] },
    })

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).endsWith('/listings/listing-1/images') &&
            (init?.method ?? 'GET') === 'POST',
        ),
      ).toBe(true)
    })
  })

  it('allows the owner to remove an image', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ images: [makeImage()] }),
      },
      'DELETE /listings/listing-1/images/image-1': { status: 204 },
    })
    renderDetailPage()

    const deleteButton = await screen.findByRole('button', {
      name: 'Удалить фото',
    })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([input, init]) =>
            String(input).endsWith('/listings/listing-1/images/image-1') &&
            (init?.method ?? 'GET') === 'DELETE',
        ),
      ).toBe(true)
    })
  })
})