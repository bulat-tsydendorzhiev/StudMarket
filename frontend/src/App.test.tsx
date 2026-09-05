import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function mockFetchOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ status: 'ok', service: 'api-gateway' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ),
  )
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mockFetchOk()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('renders the home page and shows gateway health status on "/"', async () => {
    window.history.pushState({}, '', '/')
    renderApp()

    expect(screen.getByRole('heading', { name: 'StudMarket' })).toBeInTheDocument()
    expect(await screen.findByText('API работает (api-gateway)')).toBeInTheDocument()
  })

  it('renders the not found page for unknown routes', () => {
    window.history.pushState({}, '', '/unknown')
    renderApp()

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()
  })

  it('renders the registration page on "/register"', () => {
    window.history.pushState({}, '', '/register')
    renderApp()

    expect(screen.getByRole('heading', { name: 'Регистрация' })).toBeInTheDocument()
  })

  it('renders the login page on "/login"', () => {
    window.history.pushState({}, '', '/login')
    renderApp()

    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })
})