import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import HomePage from './HomePage'
import {
  authenticatedAuthRoutes,
  makeListing,
  renderWithProviders,
  stubFetch,
  testTags,
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

  it('renders a filter panel with categories and dormitories', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/tags': { status: 200, body: testTags },
      'GET /listings': { status: 200, body: [] },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Фильтры')).toBeInTheDocument()
    expect(await screen.findByLabelText('Электроника')).toBeInTheDocument()
    expect(screen.getByLabelText('Бытовая техника')).toBeInTheDocument()
    expect(screen.getByLabelText('Общежитие №2')).toBeInTheDocument()
    expect(screen.getByLabelText('Общежитие №3')).toBeInTheDocument()

    const groups = document.querySelectorAll('.filters__group')
    expect(groups.length).toBe(2)
    expect(groups[0]).toContainElement(screen.getByLabelText('Электроника'))
    expect(groups[1]).toContainElement(screen.getByLabelText('Общежитие №2'))
  })

  it('filters listings when a tag is selected', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/tags': { status: 200, body: testTags },
      'GET /listings': {
        status: 200,
        body: [
          makeListing({ id: 'listing-1', title: 'Велосипед' }),
          makeListing({ id: 'listing-2', title: 'Учебник' }),
        ],
      },
      'GET /listings?tags=Электроника': {
        status: 200,
        body: [makeListing({ id: 'listing-1', title: 'Ноутбук' })],
      },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Электроника'))

    expect(await screen.findByText('Ноутбук')).toBeInTheDocument()
    expect(screen.queryByText('Велосипед')).not.toBeInTheDocument()
    const calls = fetchMock.mock.calls.filter(([input, init]) =>
      String(input).includes('/listings') && (init?.method ?? 'GET') === 'GET',
    )
    const taggedCall = calls.find(([input]) => String(input).includes('tags='))
    expect(taggedCall).toBeTruthy()
  })

  it('clears the filter when a tag is deselected', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/tags': { status: 200, body: testTags },
      'GET /listings': {
        status: 200,
        body: [makeListing({ id: 'listing-1', title: 'Велосипед' })],
      },
      'GET /listings?tags=Электроника': {
        status: 200,
        body: [makeListing({ id: 'listing-1', title: 'Ноутбук' })],
      },
    })
    renderWithProviders(<HomePage />)

    const checkbox = await screen.findByLabelText('Электроника')
    fireEvent.click(checkbox)
    expect(await screen.findByText('Ноутбук')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Электроника'))
    expect(await screen.findByText('Велосипед')).toBeInTheDocument()

    const taggedCalls = fetchMock.mock.calls.filter(([input, init]) =>
      String(input).includes('tags=') && (init?.method ?? 'GET') === 'GET',
    )
    expect(taggedCalls.length).toBeGreaterThan(0)
    const lastListCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).includes('/listings') && (init?.method ?? 'GET') === 'GET',
    )
    expect(String(lastListCall?.[0])).not.toContain('tags=')
  })
})