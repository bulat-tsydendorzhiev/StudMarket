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

  it('renders the QR code image', () => {
    stubFetch(guestAuthRoutes())
    renderWithProviders(<ListingPaymentPage />, ['/listings/payment'])

    const qr = screen.getByRole('img', { name: 'QR-код для оплаты' })
    expect(qr).toHaveAttribute('src', '/payment-qr.webp')
  })

  it('provides a link back to the homepage', () => {
    stubFetch(guestAuthRoutes())
    renderWithProviders(<ListingPaymentPage />, ['/listings/payment'])

    expect(
      screen.getByRole('link', { name: 'На главную' }),
    ).toHaveAttribute('href', '/')
  })
})