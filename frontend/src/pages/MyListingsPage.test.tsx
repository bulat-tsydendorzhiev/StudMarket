import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import MyListingsPage from './MyListingsPage'
import {
  authenticatedAuthRoutes,
  makeImage,
  makeListing,
  renderWithProviders,
  stubFetch,
} from '../testHelpers'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MyListingsPage', () => {
  it('shows an empty state with a link to create a listing', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/my': { status: 200, body: [] },
    })
    renderWithProviders(<MyListingsPage />)

    expect(
      await screen.findByText('У вас пока нет объявлений'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Мои объявления' })).toBeInTheDocument()
    const createLink = screen.getByRole('link', { name: 'Разместить объявление' })
    expect(createLink).toHaveAttribute('href', '/listings/new')
  })

  it('renders only own listings as cards with status and dates', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/my': {
        status: 200,
        body: [
          makeListing({
            id: 'listing-active',
            title: 'Велосипед',
            price: 1500,
            status: 'ACTIVE',
            created_at: '2026-09-01T00:00:00Z',
            expires_at: '2026-09-08T00:00:00Z',
            images: [
              makeImage({
                listing_id: 'listing-active',
                url: '/listings/listing-active/images/image-1',
              }),
            ],
          }),
          makeListing({
            id: 'listing-sold',
            title: 'Учебник',
            price: 300,
            status: 'SOLD',
          }),
        ],
      },
    })
    renderWithProviders(<MyListingsPage />)

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.getByText('1500 ₽')).toBeInTheDocument()
    expect(screen.getByText('Активно')).toBeInTheDocument()
    expect(screen.getByText('Продано')).toBeInTheDocument()
    expect(screen.getAllByText(/Создано/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Действует до/).length).toBeGreaterThan(0)

    const card = screen.getByRole('link', { name: /Велосипед/ })
    expect(card).toHaveAttribute('href', '/listings/listing-active')
    const image = screen.getByAltText('Велосипед')
    expect(image).toHaveAttribute(
      'src',
      expect.stringContaining('/listings/listing-active/images/image-1'),
    )
  })

  it('shows an error state when listings fail to load', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/my': { status: 500, body: { detail: 'boom' } },
    })
    renderWithProviders(<MyListingsPage />)

    expect(
      await screen.findByText('Не удалось загрузить объявления'),
    ).toBeInTheDocument()
  })
})
