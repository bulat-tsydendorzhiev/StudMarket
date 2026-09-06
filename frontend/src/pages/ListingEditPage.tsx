import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { listingsApi } from '../api/listings'
import ImageManager from '../components/ImageManager'
import ListingForm, { type ListingFormValues } from '../components/ListingForm'
import SiteHeader from '../components/SiteHeader'

export default function ListingEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: listing, isLoading, isError } = useQuery({
    queryKey: ['listings', id],
    queryFn: () => listingsApi.get(id!),
    enabled: Boolean(id),
  })

  const mutation = useMutation({
    mutationFn: (values: ListingFormValues) =>
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
      <SiteHeader />

      <main className="listing-page__main">
        <h1 className="listing-form__title">Редактирование объявления</h1>
        {isLoading && <p style={{ color: 'var(--text-muted)' }}>Загрузка…</p>}
        {isError && <p style={{ color: 'var(--error-text)' }}>Не удалось загрузить объявление</p>}
        {listing && (
          <ListingForm
            initialValues={{
              title: listing.title,
              description: listing.description,
              price: listing.price,
              tags: listing.tags,
              location: listing.location,
              expiresInDays: 7,
            }}
            showExpiration={false}
            submitLabel="Сохранить изменения"
            submittingLabel="Сохранение…"
            pending={mutation.isPending}
            error={mutation.isError ? 'Не удалось сохранить изменения' : ''}
            onSubmit={(values) => mutation.mutate(values)}
          />
        )}

        {listing && (
          <section className="listing-edit__images">
            <h2 className="listing-form__title">Фотографии</h2>
            <ImageManager
              listingId={listing.id}
              images={listing.images ?? []}
              owner
            />
          </section>
        )}
      </main>
    </div>
  )
}
