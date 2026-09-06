import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState, type ChangeEvent } from 'react'
import { imageUrl, listingsApi, type ListingImage } from '../api/listings'

interface ImageManagerProps {
  listingId: string
  images: ListingImage[]
  owner: boolean
}

export default function ImageManager({ listingId, images, owner }: ImageManagerProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const invalidateListing = () => {
    queryClient.invalidateQueries({ queryKey: ['listings', listingId] })
  }

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => listingsApi.uploadImages(listingId, files),
    onSuccess: invalidateListing,
  })

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => listingsApi.deleteImage(listingId, imageId),
    onSuccess: invalidateListing,
  })

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) {
      uploadMutation.mutate(files)
    }
    event.target.value = ''
  }

  if (images.length === 0) {
    return (
      <div className="listing-detail__photo">
        <span>Без фото</span>
        {owner && (
          <button
            className="listing-detail__add-photo"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Загрузка…' : 'Добавить фотографии'}
          </button>
        )}
        {owner && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            onChange={handleFileChange}
          />
        )}
        {uploadMutation.isError && (
          <span className="listing-detail__error">Не удалось загрузить фото</span>
        )}
      </div>
    )
  }

  const active = images[activeIndex] ?? images[0]

  return (
    <div className="gallery">
      <div className="gallery__main">
        <img
          className="gallery__image"
          src={imageUrl(active.url)}
          alt="Фото объявления"
        />
        {owner && (
          <button
            className="gallery__delete"
            type="button"
            onClick={() => {
              deleteMutation.mutate(active.id)
              if (activeIndex >= images.length - 1 && images.length > 1) {
                setActiveIndex(images.length - 2)
              } else if (images.length === 1) {
                setActiveIndex(0)
              }
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Удаление…' : 'Удалить фото'}
          </button>
        )}
      </div>

      <div className="gallery__thumbs">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            className={
              index === activeIndex
                ? 'gallery__thumb gallery__thumb--active'
                : 'gallery__thumb'
            }
            onClick={() => setActiveIndex(index)}
          >
            <img src={imageUrl(image.url)} alt="Миниатюра фото" />
          </button>
        ))}
        {owner && (
          <>
            <button
              className="gallery__add"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? 'Загрузка…' : 'Добавить фото'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              hidden
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {uploadMutation.isError && (
        <p className="listing-detail__error">Не удалось загрузить фото</p>
      )}
      {deleteMutation.isError && (
        <p className="listing-detail__error">Не удалось удалить фото</p>
      )}
    </div>
  )
}