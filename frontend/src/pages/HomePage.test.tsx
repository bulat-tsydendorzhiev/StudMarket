import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import HomePage from './HomePage'
import {
  authenticatedAuthRoutes,
  locationsRoutes,
  makeImage,
  makeListing,
  renderWithProviders,
  stubFetch,
  tagsRoutes,
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

  it('displays the primary image on a listing card', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings': {
        status: 200,
        body: [
          makeListing({
            id: 'listing-1',
            title: 'Велосипед',
            images: [makeImage()],
          }),
          makeListing({ id: 'listing-2', title: 'Учебник' }),
        ],
      },
    })
    renderWithProviders(<HomePage />)

    await screen.findByText('Велосипед')
    const primary = screen.getByAltText('Велосипед')
    expect(primary).toHaveAttribute('src', expect.stringContaining('/listings/listing-1/images/image-1'))
    expect(screen.getByText('Фото скоро появится')).toBeInTheDocument()
  })

  it('shows a "Чаты" link for authenticated users', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings': { status: 200, body: [] },
    })
    renderWithProviders(<HomePage />)

    const chatLink = await screen.findByRole('link', { name: 'Чаты' })
    expect(chatLink).toHaveAttribute('href', '/chat')
  })

  it('renders a filter panel with categories and locations', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      ...tagsRoutes(),
      ...locationsRoutes(),
      'GET /listings': { status: 200, body: [] },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Фильтры')).toBeInTheDocument()
    expect(await screen.findByLabelText('Электроника')).toBeInTheDocument()
    expect(screen.getByLabelText('Бытовая техника')).toBeInTheDocument()
    expect(screen.getByLabelText('Общежитие №2')).toBeInTheDocument()
    expect(screen.getByLabelText('Общежитие №3')).toBeInTheDocument()
    expect(screen.getByLabelText('Город')).toBeInTheDocument()

    const groups = document.querySelectorAll('.filters__group')
    expect(groups.length).toBe(2)
    expect(groups[0]).toContainElement(screen.getByLabelText('Электроника'))
    expect(groups[1]).toContainElement(screen.getByLabelText('Общежитие №2'))
  })

  it('filters listings when a tag is selected', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      ...tagsRoutes(),
      ...locationsRoutes(),
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

  it('filters listings when a location is selected', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      ...tagsRoutes(),
      ...locationsRoutes(),
      'GET /listings': {
        status: 200,
        body: [
          makeListing({ id: 'listing-1', title: 'Велосипед' }),
          makeListing({ id: 'listing-2', title: 'Учебник' }),
        ],
      },
      'GET /listings?location=Общежитие%20№3': {
        status: 200,
        body: [makeListing({ id: 'listing-1', title: 'Телефон' })],
      },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Общежитие №3'))

    expect(await screen.findByText('Телефон')).toBeInTheDocument()
    const calls = fetchMock.mock.calls.filter(([input, init]) =>
      String(input).includes('/listings') && (init?.method ?? 'GET') === 'GET',
    )
    const locatedCall = calls.find(([input]) => String(input).includes('location='))
    expect(locatedCall).toBeTruthy()
  })

  it('excludes listings on the second click and marks the checkbox with a cross', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      ...tagsRoutes(),
      ...locationsRoutes(),
      'GET /listings': {
        status: 200,
        body: [makeListing({ id: 'listing-1', title: 'Велосипед' })],
      },
      'GET /listings?tags=Электроника': {
        status: 200,
        body: [makeListing({ id: 'listing-1', title: 'Ноутбук' })],
      },
      'GET /listings?exclude_tags=Электроника': {
        status: 200,
        body: [makeListing({ id: 'listing-2', title: 'Учебник' })],
      },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Велосипед')).toBeInTheDocument()

    const checkbox = screen.getByLabelText('Электроника')
    fireEvent.click(checkbox)
    expect(await screen.findByText('Ноутбук')).toBeInTheDocument()
    expect(checkbox).not.toHaveClass('filters__checkbox--excluded')

    fireEvent.click(checkbox)
    expect(await screen.findByText('Учебник')).toBeInTheDocument()
    expect(screen.queryByText('Велосипед')).not.toBeInTheDocument()
    expect(checkbox).toHaveClass('filters__checkbox--excluded')

    const calls = fetchMock.mock.calls.filter(([input, init]) =>
      String(input).includes('/listings') && (init?.method ?? 'GET') === 'GET',
    )
    const excludedCall = calls.find(([input]) => String(input).includes('exclude_tags='))
    expect(excludedCall).toBeTruthy()
  })

  it('third click clears the tag filter and the cross', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      ...tagsRoutes(),
      ...locationsRoutes(),
      'GET /listings': {
        status: 200,
        body: [makeListing({ id: 'listing-1', title: 'Велосипед' })],
      },
      'GET /listings?tags=Электроника': {
        status: 200,
        body: [makeListing({ id: 'listing-1', title: 'Ноутбук' })],
      },
      'GET /listings?exclude_tags=Электроника': {
        status: 200,
        body: [makeListing({ id: 'listing-2', title: 'Учебник' })],
      },
    })
    renderWithProviders(<HomePage />)

    const checkbox = await screen.findByLabelText('Электроника')
    fireEvent.click(checkbox)
    expect(await screen.findByText('Ноутбук')).toBeInTheDocument()

    fireEvent.click(checkbox)
    expect(await screen.findByText('Учебник')).toBeInTheDocument()
    expect(checkbox).toHaveClass('filters__checkbox--excluded')

    fireEvent.click(checkbox)
    expect(await screen.findByText('Велосипед')).toBeInTheDocument()
    expect(checkbox).not.toHaveClass('filters__checkbox--excluded')

    const lastListCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).includes('/listings') && (init?.method ?? 'GET') === 'GET',
    )
    const lastUrl = String(lastListCall?.[0])
    expect(lastUrl).not.toContain('tags=')
    expect(lastUrl).not.toContain('exclude_tags=')
  })
})