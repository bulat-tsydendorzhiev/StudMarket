import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { render } from '@testing-library/react'
import SearchBar from './SearchBar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function LocationProbe() {
  const location = useLocation()
  return <span data-testid="location">{location.pathname + location.search}</span>
}

function renderSearchBar(defaultValue?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <SearchBar defaultValue={defaultValue} />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SearchBar', () => {
  it('renders a search input with placeholder', () => {
    renderSearchBar()

    const input = screen.getByLabelText('Поиск объявлений')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveAttribute('placeholder', 'Поиск объявлений')
  })

  it('pre-fills the input from defaultValue', () => {
    renderSearchBar('велосипед')

    expect(screen.getByLabelText('Поиск объявлений')).toHaveValue('велосипед')
  })

  it('navigates to "/?q=..." when a query is submitted', () => {
    renderSearchBar()

    const input = screen.getByLabelText('Поиск объявлений')
    fireEvent.change(input, {
      target: { value: 'велосипед' },
    })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    const location = screen.getByTestId('location')
    expect(location.textContent).toBe('/?q=%D0%B2%D0%B5%D0%BB%D0%BE%D1%81%D0%B8%D0%BF%D0%B5%D0%B4')
  })

  it('navigates to "/" when an empty query is submitted', () => {
    renderSearchBar()

    const input = screen.getByLabelText('Поиск объявлений')
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByTestId('location').textContent).toBe('/')
  })
})