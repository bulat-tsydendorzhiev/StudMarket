import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
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
  const [lightboxOpen, setLightboxOpen] = useState(false)

  useEffect(() => {
    if (!lightboxOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [lightboxOpen])

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
        <span>Фото скоро появится</span>
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
        <button
          className="gallery__zoom"
          type="button"
          onClick={() => setLightboxOpen(true)}
          title="Увеличить фото"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
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

      {lightboxOpen && (
        <div className="lightbox" onClick={() => setLightboxOpen(false)}>
          <button
            className="lightbox__close"
            type="button"
            onClick={() => setLightboxOpen(false)}
            title="Закрыть"
          >
            &times;
          </button>
          <img
            className="lightbox__image"
            src={imageUrl(active.url)}
            alt="Фото объявления (увеличенное)"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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