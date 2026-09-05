import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import ListingEditPage from './ListingEditPage'
import ListingNewPage from './ListingNewPage'
import {
  authenticatedAuthRoutes,
  guestAuthRoutes,
  makeListing,
  renderWithProviders,
  stubFetch,
  tagsRoutes,
} from '../testHelpers'

function renderNewPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/listings/new" element={<ListingNewPage />} />
      <Route path="/listings/:id" element={<div>Listing Page</div>} />
    </Routes>,
    ['/listings/new'],
  )
}

function renderEditPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/listings/:id/edit" element={<ListingEditPage />} />
      <Route path="/listings/:id" element={<div>Listing Page</div>} />
    </Routes>,
    ['/listings/listing-1/edit'],
  )
}

function fillForm(overrides: Partial<Record<string, string>> = {}) {
  const values = { title: 'Велосипед', description: 'Почти новый', price: '1500', ...overrides }
  fireEvent.change(screen.getByLabelText('Название'), { target: { value: values.title } })
  fireEvent.change(screen.getByLabelText('Описание'), {
    target: { value: values.description },
  })
  fireEvent.change(screen.getByLabelText(/Цена, ₽/), { target: { value: values.price } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ListingNewPage', () => {
  it('renders the create form', () => {
    stubFetch(guestAuthRoutes())
    renderNewPage()

    expect(
      screen.getByRole('heading', { name: 'Новое объявление' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Название')).toBeInTheDocument()
    expect(screen.getByLabelText('Описание')).toBeInTheDocument()
    expect(screen.getByLabelText(/Цена, ₽/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать объявление' })).toBeInTheDocument()
  })

  it('creates a listing and navigates to it', async () => {
    const fetchMock = stubFetch({
      ...guestAuthRoutes(),
      'POST /listings': {
        status: 201,
        body: makeListing({ id: 'listing-new' }),
      },
    })
    renderNewPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Создать объявление' }))

    expect(await screen.findByText('Listing Page')).toBeInTheDocument()

    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/listings'),
    )
    const body = JSON.parse(createCall?.[1]?.body as string) as Record<string, unknown>
    expect(body).toEqual({
      title: 'Велосипед',
      description: 'Почти новый',
      price: 1500,
      tags: [],
    })
  })

  it('creates a free listing when the price is left empty', async () => {
    const fetchMock = stubFetch({
      ...guestAuthRoutes(),
      'POST /listings': {
        status: 201,
        body: makeListing({ id: 'listing-free', price: 0 }),
      },
    })
    renderNewPage()

    fillForm({ price: '' })
    fireEvent.click(screen.getByRole('button', { name: 'Создать объявление' }))

    expect(await screen.findByText('Listing Page')).toBeInTheDocument()

    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/listings'),
    )
    const body = JSON.parse(createCall?.[1]?.body as string) as Record<string, unknown>
    expect(body).toEqual({ title: 'Велосипед', description: 'Почти новый', price: 0, tags: [] })
  })

  it('inserts Markdown formatting from the toolbar', () => {
    stubFetch(guestAuthRoutes())
    renderNewPage()

    const description = screen.getByLabelText('Описание')
    fireEvent.click(description)
    fireEvent.click(screen.getByLabelText('Жирный'))

    expect(description).toHaveValue('**жирный текст**')
  })

  it('previews the description as Markdown', () => {
    stubFetch(guestAuthRoutes())
    renderNewPage()

    fireEvent.change(screen.getByLabelText('Описание'), {
      target: { value: '# Заголовок\n\n**жирный** текст' },
    })
    fireEvent.click(screen.getByRole('tab', { name: 'Предпросмотр' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Заголовок' }),
    ).toBeInTheDocument()
    const strong = screen.getByText('жирный')
    expect(strong.tagName).toBe('STRONG')
  })

  it('shows validation errors and does not submit for empty fields', async () => {
    const fetchMock = stubFetch(guestAuthRoutes())
    renderNewPage()

    fillForm({ title: '', description: '', price: '-5' })
    fireEvent.click(screen.getByRole('button', { name: 'Создать объявление' }))

    expect(await screen.findByText('Укажите название')).toBeInTheDocument()
    expect(screen.getByText('Укажите описание')).toBeInTheDocument()
    expect(screen.getByText('Укажите корректную цену')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(([input]) => String(input).endsWith('/listings')),
    ).toBe(false)
  })

  it('shows a server error when creation fails', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'POST /listings': { status: 422, body: { detail: 'invalid' } },
    })
    renderNewPage()

    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Создать объявление' }))

    expect(
      await screen.findByText('Не удалось создать объявление'),
    ).toBeInTheDocument()
  })

  it('renders tag checkboxes from the tag list', async () => {
    stubFetch({ ...guestAuthRoutes(), ...tagsRoutes() })
    renderNewPage()

    expect(await screen.findByLabelText('Электроника')).toBeInTheDocument()
    expect(screen.getByLabelText('Общежитие №2')).toBeInTheDocument()
  })

  it('submits the selected tags with the listing', async () => {
    const fetchMock = stubFetch({
      ...guestAuthRoutes(),
      ...tagsRoutes(),
      'POST /listings': {
        status: 201,
        body: makeListing({ id: 'listing-new' }),
      },
    })
    renderNewPage()

    fireEvent.click(await screen.findByLabelText('Электроника'))
    fireEvent.click(screen.getByLabelText('Общежитие №3'))
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Создать объявление' }))

    expect(await screen.findByText('Listing Page')).toBeInTheDocument()

    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/listings'),
    )
    const body = JSON.parse(createCall?.[1]?.body as string) as Record<string, unknown>
    expect(body).toEqual({
      title: 'Велосипед',
      description: 'Почти новый',
      price: 1500,
      tags: ['Электроника', 'Общежитие №3'],
    })
  })
})

describe('ListingEditPage', () => {
  it('prefills the form with the listing data', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ title: 'Старый велосипед', price: 1200 }),
      },
    })
    renderEditPage()

    expect(
      await screen.findByRole('heading', { name: 'Редактирование объявления' }),
    ).toBeInTheDocument()
    expect(await screen.findByLabelText('Название')).toHaveValue('Старый велосипед')
    expect(screen.getByLabelText('Описание')).toHaveValue('Почти новый велосипед')
    expect(screen.getByLabelText(/Цена, ₽/)).toHaveValue(1200)
  })

  it('updates the listing and navigates to it', async () => {
    const fetchMock = stubFetch({
      ...guestAuthRoutes(),
      'GET /listings/listing-1': { status: 200, body: makeListing() },
      'PATCH /listings/listing-1': {
        status: 200,
        body: makeListing({ title: 'Новый велосипед', price: 2000 }),
      },
    })
    renderEditPage()

    await screen.findByRole('heading', { name: 'Редактирование объявления' })
    await screen.findByLabelText('Название')
    fillForm({ title: 'Новый велосипед', price: '2000' })
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить изменения' }))

    expect(await screen.findByText('Listing Page')).toBeInTheDocument()

    const updateCall = fetchMock.mock.calls.find(([input, init]) =>
      String(input).endsWith('/listings/listing-1') && (init?.method ?? 'GET') === 'PATCH',
    )
    const body = JSON.parse(updateCall?.[1]?.body as string) as Record<string, unknown>
    expect(body).toEqual({
      title: 'Новый велосипед',
      description: 'Почти новый',
      price: 2000,
      tags: [],
    })
  })

  it('prefills the selected tags when editing', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      ...tagsRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ tags: ['Электроника', 'Общежитие №2'] }),
      },
    })
    renderEditPage()

    expect(
      await screen.findByRole('heading', { name: 'Редактирование объявления' }),
    ).toBeInTheDocument()
    const electronics = await screen.findByLabelText('Электроника')
    const dorm = screen.getByLabelText('Общежитие №2')
    expect(electronics).toBeChecked()
    expect(dorm).toBeChecked()
    expect(screen.getByLabelText('Спорт')).not.toBeChecked()
  })

  it('shows an error when the listing fails to load', async () => {
    stubFetch({ ...authenticatedAuthRoutes() })
    renderEditPage()

    expect(await screen.findByText('Не удалось загрузить объявление')).toBeInTheDocument()
  })
})