import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import ListingEditPage from './ListingEditPage'
import ListingNewPage from './ListingNewPage'
import ListingPaymentPage from './ListingPaymentPage'
import {
  authenticatedAuthRoutes,
  guestAuthRoutes,
  locationsRoutes,
  makeImage,
  makeListing,
  renderWithProviders,
  stubFetch,
  tagsRoutes,
} from '../testHelpers'

function renderNewPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/listings/new" element={<ListingNewPage />} />
      <Route path="/listings/payment" element={<ListingPaymentPage />} />
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
    expect(screen.getByLabelText('Локация')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '1 день' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '7 дней' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '30 дней' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать объявление' })).toBeInTheDocument()
  })

  it('selects 7 days by default', () => {
    stubFetch(guestAuthRoutes())
    renderNewPage()

    expect(screen.getByRole('radio', { name: '7 дней' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '1 день' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: '30 дней' })).not.toBeChecked()
  })

  it('shows a payment notice when the 30-day option is selected', () => {
    stubFetch(guestAuthRoutes())
    renderNewPage()

    expect(
      screen.queryByText(/Размещение на 30 дней платное/),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: '30 дней' }))

    expect(
      screen.getByText(/Размещение на 30 дней платное/),
    ).toBeInTheDocument()
  })

  it('redirects to the payment page for the 30-day option without creating a listing', async () => {
    const fetchMock = stubFetch(guestAuthRoutes())
    renderNewPage()

    fireEvent.click(screen.getByRole('radio', { name: '30 дней' }))
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Создать объявление' }))

    expect(
      await screen.findByRole('heading', { name: 'Оплата размещения' }),
    ).toBeInTheDocument()
    const createCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/listings'),
    )
    expect(createCall).toBeUndefined()
  })

  it('submits the chosen expiration duration', async () => {
    const fetchMock = stubFetch({
      ...guestAuthRoutes(),
      'POST /listings': {
        status: 201,
        body: makeListing({ id: 'listing-new' }),
      },
    })
    renderNewPage()

    fireEvent.click(screen.getByRole('radio', { name: '1 день' }))
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
      location: null,
      expires_in_days: 1,
    })
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
      location: null,
      expires_in_days: 7,
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
    expect(body).toEqual({
      title: 'Велосипед',
      description: 'Почти новый',
      price: 0,
      tags: [],
      location: null,
      expires_in_days: 7,
    })
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

  it('renders tag checkboxes and location options', async () => {
    stubFetch({ ...guestAuthRoutes(), ...tagsRoutes(), ...locationsRoutes() })
    renderNewPage()

    expect(await screen.findByLabelText('Электроника')).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Общежитие №2' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: 'Город' }),
    ).toBeInTheDocument()
  })

  it('submits the selected tags and location with the listing', async () => {
    const fetchMock = stubFetch({
      ...guestAuthRoutes(),
      ...tagsRoutes(),
      ...locationsRoutes(),
      'POST /listings': {
        status: 201,
        body: makeListing({ id: 'listing-new' }),
      },
    })
    renderNewPage()

    fireEvent.click(await screen.findByLabelText('Электроника'))
    fireEvent.click(screen.getByLabelText('Спорт'))
    fireEvent.change(screen.getByLabelText('Локация'), {
      target: { value: 'Общежитие №3' },
    })
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
      tags: ['Электроника', 'Спорт'],
      location: 'Общежитие №3',
      expires_in_days: 7,
    })
  })

  it('uploads selected photos after creating the listing', async () => {
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()

    try {
      const fetchMock = stubFetch({
        ...guestAuthRoutes(),
        'POST /listings': {
          status: 201,
          body: makeListing({ id: 'listing-new' }),
        },
        'POST /listings/listing-new/images': {
          status: 201,
          body: [makeImage({ id: 'image-new', listing_id: 'listing-new' })],
        },
      })
      renderNewPage()

      fillForm()
      fireEvent.click(screen.getByRole('button', { name: 'Добавить фото' }))
      const fileInput = document.querySelector('input[type=file]')
      fireEvent.change(fileInput!, {
        target: {
          files: [new File(['fake-jpeg'], 'photo.jpg', { type: 'image/jpeg' })],
        },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Создать объявление' }))

      expect(await screen.findByText('Listing Page')).toBeInTheDocument()

      const imageCall = fetchMock.mock.calls.find(
        ([input, init]) =>
          String(input).endsWith('/listings/listing-new/images') &&
          (init?.method ?? 'GET') === 'POST',
      )
      expect(imageCall).toBeTruthy()
      expect(imageCall?.[1]?.body).toBeInstanceOf(FormData)
    } finally {
      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
    }
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
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ id: 'listing-1', location: 'Город' }),
      },
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
      location: 'Город',
    })
  })

  it('prefills the selected tags and location when editing', async () => {
    stubFetch({
      ...guestAuthRoutes(),
      ...tagsRoutes(),
      ...locationsRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({
          tags: ['Электроника', 'Спорт'],
          location: 'Общежитие №2',
        }),
      },
    })
    renderEditPage()

    expect(
      await screen.findByRole('heading', { name: 'Редактирование объявления' }),
    ).toBeInTheDocument()
    const electronics = await screen.findByLabelText('Электроника')
    const sport = screen.getByLabelText('Спорт')
    expect(electronics).toBeChecked()
    expect(sport).toBeChecked()
    expect(screen.getByLabelText('Бытовая техника')).not.toBeChecked()
    expect(screen.getByLabelText('Локация')).toHaveValue('Общежитие №2')
  })

  it('shows an error when the listing fails to load', async () => {
    stubFetch({ ...authenticatedAuthRoutes() })
    renderEditPage()

    expect(await screen.findByText('Не удалось загрузить объявление')).toBeInTheDocument()
  })

  it('renders the photos manager on the edit page', async () => {
    stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': {
        status: 200,
        body: makeListing({ images: [makeImage()] }),
      },
    })
    renderEditPage()

    expect(
      await screen.findByRole('heading', { name: 'Фотографии' }),
    ).toBeInTheDocument()
    expect(await screen.findByAltText('Фото объявления')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Удалить фото' }),
    ).toBeInTheDocument()
  })

  it('allows uploading photos from the edit page', async () => {
    const fetchMock = stubFetch({
      ...authenticatedAuthRoutes(),
      'GET /listings/listing-1': { status: 200, body: makeListing() },
      'POST /listings/listing-1/images': { status: 201, body: [makeImage()] },
    })
    renderEditPage()

    await screen.findByRole('heading', { name: 'Редактирование объявления' })
    const addButton = await screen.findByRole('button', {
      name: 'Добавить фотографии',
    })
    const fileInput = addButton.parentElement?.querySelector(
      'input[type=file]',
    )
    fireEvent.change(fileInput!, {
      target: {
        files: [new File(['fake-jpeg'], 'photo.jpg', { type: 'image/jpeg' })],
      },
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
})