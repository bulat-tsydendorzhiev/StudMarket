import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface SearchBarProps {
  defaultValue?: string
  searchBase?: string
}

export default function SearchBar({ defaultValue = '', searchBase = '/' }: SearchBarProps) {
  const [value, setValue] = useState(defaultValue)
  const navigate = useNavigate()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (trimmed) {
      navigate(`${searchBase}?q=${encodeURIComponent(trimmed)}`)
    } else {
      navigate(searchBase)
    }
  }

  return (
    <form className="navbar-search" onSubmit={handleSubmit}>
      <input
        className="navbar-search__input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Поиск объявлений"
        aria-label="Поиск объявлений"
      />
    </form>
  )
}
