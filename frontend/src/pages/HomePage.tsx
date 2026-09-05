import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'

interface HealthResponse {
  status: string
  service: string
}

export default function HomePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiClient.get<HealthResponse>('/health'),
  })

  return (
    <div className="home">
      <header className="home__header">
        <span className="home__logo">StudMarket</span>
      </header>

      <main className="home__main">
        <h1 className="home__title">StudMarket</h1>
        <p className="home__subtitle">Купить и продать среди студентов</p>

        <div className="home__status" role="status">
          {isLoading && 'Проверка подключения к API…'}
          {isError && 'API недоступно'}
          {data && `API работает (${data.service})`}
        </div>
      </main>
    </div>
  )
}