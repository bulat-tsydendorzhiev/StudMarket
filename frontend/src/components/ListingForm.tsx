import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import MarkdownEditor from './MarkdownEditor'
import { tagsApi } from '../api/listings'

export interface ListingFormValues {
  title: string
  description: string
  price: number
  tags: string[]
}

interface FieldErrors {
  title?: string
  description?: string
  price?: string
}

interface ListingFormProps {
  initialValues?: ListingFormValues
  submitLabel: string
  submittingLabel: string
  pending: boolean
  error: string
  onSubmit: (values: ListingFormValues) => void
}

function isDormitory(name: string): boolean {
  return name.startsWith('Общежитие')
}

function dormitoryNumber(name: string): number {
  const match = name.match(/№(\d+)/)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

export default function ListingForm({
  initialValues,
  submitLabel,
  submittingLabel,
  pending,
  error,
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { data: availableTags } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.list,
  })

  const categories = (availableTags ?? [])
    .filter((tag) => !isDormitory(tag.name))
    .sort((a, b) => a.name.localeCompare(b.name))
  const dormitories = (availableTags ?? [])
    .filter((tag) => isDormitory(tag.name))
    .sort((a, b) => dormitoryNumber(a.name) - dormitoryNumber(b.name))

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

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      price: price ? parsedPrice : 0,
      tags: selectedTags,
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
          onChange={(e) => setPrice(e.target.value)}
        />
        {fieldErrors.price && <span className="listing-form__error">{fieldErrors.price}</span>}
      </label>

      <fieldset className="listing-form__field listing-form__tags">
        <legend>Теги</legend>
        {categories.length > 0 && (
          <div className="listing-form__tag-group">{renderTagCheckboxes(categories)}</div>
        )}
        {dormitories.length > 0 && (
          <div className="listing-form__tag-group">{renderTagCheckboxes(dormitories)}</div>
        )}
      </fieldset>

      {error && <p className="listing-form__server-error">{error}</p>}

      <button className="listing-form__submit" type="submit" disabled={pending}>
        {pending ? submittingLabel : submitLabel}
      </button>
    </form>
  )
}