import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listingsApi } from '../api/listings'
import ListingForm from '../components/ListingForm'

export default function ListingEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listings', id],
    queryFn: () => listingsApi.get(id!),
    enabled: Boolean(id),
  })

  const mutation = useMutation({
    mutationFn: (values: {
      title: string
      description: string
      price: number
      tags: string[]
      location: string | null
    }) =>
      listingsApi.update(id!, {
        title: values.title,
        description: values.description,
        price: values.price,
        tags: values.tags,
        location: values.location,
      }),
    onSuccess: (updated) => navigate(`/listings/${updated.id}`),
  })

  return (
    <div className="listing-page">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          StudMarket
        </Link>
      </header>

      <main className="listing-page__main">
        <h1 className="listing-form__title">Редактирование объявления</h1>
        {isLoading && <p>Загрузка…</p>}
        {isError && <p>Не удалось загрузить объявление</p>}
        {listing && (
          <ListingForm
            initialValues={{
              title: listing.title,
              description: listing.description,
              price: listing.price,
              tags: listing.tags,
              location: listing.location,
            }}
            submitLabel="Сохранить изменения"
            submittingLabel="Сохранение…"
            pending={mutation.isPending}
            error={mutation.isError ? 'Не удалось сохранить изменения' : ''}
            onSubmit={(values) => mutation.mutate(values)}
          />
        )}
      </main>
    </div>
  )
}