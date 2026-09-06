import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders, stubFetch, guestAuthRoutes } from '../testHelpers'
import ListingPaymentPage from './ListingPaymentPage'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ListingPaymentPage', () => {
  it('informs the user that payment via QR code is required', () => {
    stubFetch(guestAuthRoutes())
    renderWithProviders(<ListingPaymentPage />, ['/listings/payment'])

    expect(
      screen.getByRole('heading', { name: 'Оплата размещения' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/нужно оплатить размещение/)).toBeInTheDocument()
    expect(screen.getByText(/Отсканируйте QR-код/)).toBeInTheDocument()
  })

  it('reserves a placeholder area for the QR code', () => {
    stubFetch(guestAuthRoutes())
    renderWithProviders(<ListingPaymentPage />, ['/listings/payment'])

    expect(
      screen.getByText('QR-код появится после подключения оплаты'),
    ).toBeInTheDocument()
  })

  it('provides a link back to the homepage', () => {
    stubFetch(guestAuthRoutes())
    renderWithProviders(<ListingPaymentPage />, ['/listings/payment'])

    expect(
      screen.getByRole('link', { name: 'На главную' }),
    ).toHaveAttribute('href', '/')
  })
})