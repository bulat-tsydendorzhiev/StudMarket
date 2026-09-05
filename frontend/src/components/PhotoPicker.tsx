import { useRef, useState, type ChangeEvent } from 'react'

interface PhotoPickerProps {
  files: File[]
  onChange: (files: File[]) => void
}

export default function PhotoPicker({ files, onChange }: PhotoPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previews] = useState<Map<File, string>>(new Map())
  const [previewError, setPreviewError] = useState<Set<string>>(new Set())

  const addFiles = (newFiles: File[]) => {
    const unique = newFiles.filter(
      (file) => !files.some((existing) => existing === file),
    )
    for (const file of unique) {
      if (!previews.has(file)) {
        previews.set(file, URL.createObjectURL(file))
      }
    }
    onChange([...files, ...unique])
  }

  const removeFile = (index: number) => {
    const removed = files[index]
    const url = previews.get(removed)
    if (url) {
      URL.revokeObjectURL(url)
      previews.delete(removed)
    }
    onChange(files.filter((_, i) => i !== index))
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? [])
    if (selected.length > 0) {
      addFiles(selected)
    }
    event.target.value = ''
  }

  return (
    <div className="photo-picker">
      <div className="photo-picker__grid">
        {(files.length === 0 ? [null] : files).map((file, index) =>
          file === null ? (
            <button
              key="add"
              className="photo-picker__add"
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Добавить фото
            </button>
          ) : (
            <div className="photo-picker__item" key={index}>
              {previewError.has(file.name + index) ? (
                <span className="photo-picker__placeholder">Фото</span>
              ) : (
                <img
                  className="photo-picker__image"
                  src={previews.get(file)}
                  alt={`Фото ${index + 1}`}
                  onError={() => {
                    setPreviewError(
                      (prev) => new Set(prev).add(file.name + index),
                    )
                    const url = previews.get(file)
                    if (url) {
                      URL.revokeObjectURL(url)
                      previews.delete(file)
                    }
                  }}
                />
              )}
              <button
                className="photo-picker__remove"
                type="button"
                onClick={() => removeFile(index)}
              >
                Убрать
              </button>
            </div>
          ),
        )}
        {files.length > 0 && (
          <button
            className="photo-picker__add"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            Добавить ещё
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={handleFileChange}
      />
    </div>
  )
}
