import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import ListingDetailPage from './ListingDetailPage'
import {
  authenticatedAuthRoutes,
  currentUser,
  guestAuthRoutes,
  makeListing,
  renderWithProviders,
  stubFetch,
} from '../testHelpers'

function renderDetailPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<div>Home Page</div>} />
      <Route path="/listings/:id" element={<ListingDetailPage />} />
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
    expect(screen.getByText(/ID продавца/)).toBeInTheDocument()
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

  it('shows the owner username as seller information', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': { status: 200, body: makeListing() },
    })
    renderDetailPage()

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.getByText(currentUser.username)).toBeInTheDocument()
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
})