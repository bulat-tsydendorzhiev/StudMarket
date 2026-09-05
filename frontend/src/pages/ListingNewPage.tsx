import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { listingsApi } from '../api/listings'
import ListingForm, { type ListingFormValues } from '../components/ListingForm'

export default function ListingNewPage() {
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: (values: ListingFormValues) =>
      listingsApi.create({
        title: values.title,
        description: values.description,
        price: values.price,
        tags: values.tags,
      }),
    onSuccess: (listing) => navigate(`/listings/${listing.id}`),
  })

  return (
    <div className="listing-page">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          StudMarket
        </Link>
      </header>

      <main className="listing-page__main">
        <h1 className="listing-form__title">Новое объявление</h1>
        <ListingForm
          submitLabel="Создать объявление"
          submittingLabel="Создание…"
          pending={mutation.isPending}
          error={mutation.isError ? 'Не удалось создать объявление' : ''}
          onSubmit={(values) => mutation.mutate(values)}
        />
      </main>
    </div>
  )
}