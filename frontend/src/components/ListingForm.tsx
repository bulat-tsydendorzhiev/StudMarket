import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import MarkdownEditor from './MarkdownEditor'
import { locationsApi, tagsApi } from '../api/listings'

export const EXPIRATION_OPTIONS = [
  { value: 1, label: '1 день' },
  { value: 7, label: '7 дней' },
  { value: 30, label: '30 дней' },
]

export const PAID_EXPIRATION_DAYS = 30

export const DEFAULT_EXPIRATION_DAYS = 7

export interface ListingFormValues {
  title: string
  description: string
  price: number
  tags: string[]
  location: string | null
  expiresInDays: number
}

interface FieldErrors {
  title?: string
  description?: string
  price?: string
  location?: string
}

interface ListingFormProps {
  initialValues?: ListingFormValues
  submitLabel: string
  submittingLabel: string
  pending: boolean
  error: string
  showExpiration?: boolean
  onSubmit: (values: ListingFormValues) => void
}

export default function ListingForm({
  initialValues,
  submitLabel,
  submittingLabel,
  pending,
  error,
  showExpiration = true,
  onSubmit,
}: ListingFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? '')
  const [description, setDescription] = useState(initialValues?.description ?? '')
  const [price, setPrice] = useState(
    initialValues !== undefined ? String(initialValues.price) : '',
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialValues?.tags ?? [],
  )
  const [selectedLocation, setSelectedLocation] = useState<string>(
    initialValues?.location ?? '',
  )
  const [expiresInDays, setExpiresInDays] = useState(
    initialValues?.expiresInDays ?? DEFAULT_EXPIRATION_DAYS,
  )
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data: availableTags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const { data: availableLocations } = useQuery({
    queryKey: ['locations'],
    queryFn: locationsApi.list,
  })

  const categories = (availableTags ?? []).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  const toggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((tag) => tag !== name) : [...prev, name],
    )
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const errors: FieldErrors = {}
    if (!title.trim()) {
      errors.title = 'Укажите название'
    }
    if (!description.trim()) {
      errors.description = 'Укажите описание'
    }
    const parsedPrice = Number(price)
    if (price && (Number.isNaN(parsedPrice) || parsedPrice < 0)) {
      errors.price = 'Укажите корректную цену'
    }
    if (!selectedLocation) {
      errors.location = 'Укажите локацию'
    }

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      price: price ? parsedPrice : 0,
      tags: selectedTags,
      location: selectedLocation,
      expiresInDays,
    })
  }

  const renderTagCheckboxes = (tags: { id: string; name: string }[]) =>
    tags.map((tag) => (
      <label className="listing-form__tag" key={tag.id}>
        <input
          type="checkbox"
          checked={selectedTags.includes(tag.name)}
          onChange={() => toggleTag(tag.name)}
        />
        <span>{tag.name}</span>
      </label>
    ))

  return (
    <form className="listing-form" onSubmit={handleSubmit} noValidate>
      <label className="listing-form__field">
        <span>Название</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {fieldErrors.title && <span className="listing-form__error">{fieldErrors.title}</span>}
      </label>

      <div className="listing-form__field">
        <span>Описание</span>
        <MarkdownEditor value={description} onChange={setDescription} />
        {fieldErrors.description && (
          <span className="listing-form__error">{fieldErrors.description}</span>
        )}
      </div>

      <label className="listing-form__field">
        <span>Цена, ₽ (необязательно)</span>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Оставьте пустым, если бесплатно"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
        />
        {fieldErrors.price && <span className="listing-form__error">{fieldErrors.price}</span>}
      </label>

      <label className="listing-form__field">
        <span>Локация</span>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
        >
          <option value="">Выберите локацию</option>
          {(availableLocations ?? []).map((location) => (
            <option value={location.name} key={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        {fieldErrors.location && (
          <span className="listing-form__error">{fieldErrors.location}</span>
        )}
      </label>

      {showExpiration && (
        <fieldset className="listing-form__field listing-form__expiration">
          <legend>Срок размещения</legend>
          <div className="listing-form__tag-group">
            {EXPIRATION_OPTIONS.map((option) => (
              <label className="listing-form__tag" key={option.value}>
                <input
                  type="radio"
                  name="expiresInDays"
                  value={option.value}
                  checked={expiresInDays === option.value}
                  onChange={() => setExpiresInDays(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {showExpiration && expiresInDays === PAID_EXPIRATION_DAYS && (
        <p className="listing-form__expiration-info" role="status">
          Размещение на 30 дней платное — после нажатия «Создать объявление» нужно будет оплатить размещение.
        </p>
      )}

      <fieldset className="listing-form__field listing-form__tags">
        <legend>Теги</legend>
        {categories.length > 0 && (
          <div className="listing-form__tag-group">{renderTagCheckboxes(categories)}</div>
        )}
      </fieldset>

      {error && <p className="listing-form__server-error">{error}</p>}

      <button className="listing-form__submit" type="submit" disabled={pending}>
        {pending ? submittingLabel : submitLabel}
      </button>
    </form>
  )
}