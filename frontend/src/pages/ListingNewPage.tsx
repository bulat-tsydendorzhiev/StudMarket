import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listingsApi } from '../api/listings'
import ListingForm, {
  PAID_EXPIRATION_DAYS,
  type ListingFormValues,
} from '../components/ListingForm'
import MessagesLink from '../components/MessagesLink'
import PhotoPicker from '../components/PhotoPicker'
import SearchBar from '../components/SearchBar'
import UserAvatar from '../components/UserAvatar'

export default function ListingNewPage() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<File[]>([])

  const mutation = useMutation({
    mutationFn: async (values: ListingFormValues) => {
      const listing = await listingsApi.create({
        title: values.title,
        description: values.description,
        price: values.price,
        tags: values.tags,
        location: values.location,
        expires_in_days: values.expiresInDays,
      })
      if (photos.length > 0) {
        await listingsApi.uploadImages(listing.id, photos)
      }
      return listing
    },
    onSuccess: (listing) => navigate(`/listings/${listing.id}`),
  })

  return (
    <div className="listing-page">
      <header className="listing-page__header">
        <Link className="listing-page__logo" to="/">
          Stud<span className="brand__market">Market</span>
        </Link>
        <SearchBar />
        <MessagesLink />
        <UserAvatar />
      </header>

      <main className="listing-page__main">
        <h1 className="listing-form__title">Новое объявление</h1>
        <ListingForm
          submitLabel="Создать объявление"
          submittingLabel="Создание…"
          pending={mutation.isPending}
          error={mutation.isError ? 'Не удалось создать объявление' : ''}
          onSubmit={(values) => {
            if (values.expiresInDays === PAID_EXPIRATION_DAYS) {
              navigate('/listings/payment')
              return
            }
            mutation.mutate(values)
          }}
        />

        <section className="listing-form__images">
          <h2 className="listing-form__image-title">Фотографии (необязательно)</h2>
          <PhotoPicker files={photos} onChange={setPhotos} />
        </section>
      </main>
    </div>
  )
}
