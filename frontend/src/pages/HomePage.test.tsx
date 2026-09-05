import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import HomePage from './HomePage'
import {
  authenticatedAuthRoutes,
  makeListing,
  renderWithProviders,
  stubFetch,
} from '../testHelpers'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HomePage', () => {
  it('shows an empty state when there are no listings', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings': { status: 200, body: [] },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Объявлений пока нет')).toBeInTheDocument()
  })

  it('renders listing cards with title and price', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings': {
        status: 200,
        body: [
          makeListing({ id: 'listing-1', title: 'Велосипед', price: 1500 }),
          makeListing({ id: 'listing-2', title: 'Учебник', price: 300 }),
        ],
      },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(screen.getByText('1500 ₽')).toBeInTheDocument()
    expect(screen.getByText('Учебник')).toBeInTheDocument()

    const card = screen.getByRole('link', { name: /Велосипед/ })
    expect(card).toHaveAttribute('href', '/listings/listing-1')
  })

  it('renders free listings as "Бесплатно"', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings': {
        status: 200,
        body: [makeListing({ id: 'listing-free', title: 'Отдам даром', price: 0 })],
      },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Отдам даром')).toBeInTheDocument()
    expect(screen.getByText('Бесплатно')).toBeInTheDocument()
  })

  it('shows an error state when listings fail to load', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings': { status: 500, body: { detail: 'boom' } },
    })
    renderWithProviders(<HomePage />)

    expect(
      await screen.findByText('Не удалось загрузить объявления'),
    ).toBeInTheDocument()
  })
})