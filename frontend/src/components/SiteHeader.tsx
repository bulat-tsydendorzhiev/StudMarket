import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import SearchBar from './SearchBar'
import MessagesLink from './MessagesLink'
import UserAvatar from './UserAvatar'

interface SiteHeaderProps {
  searchBase?: string
  searchDefault?: string
  showCreateCta?: boolean
}

export default function SiteHeader({ searchBase, searchDefault, showCreateCta = true }: SiteHeaderProps) {
  const { isAuthenticated } = useAuth()

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-header__logo" to="/">
          <span className="logo-mark" aria-hidden="true" />
          <span className="site-header__brand">Stud<span className="site-header__brand-accent">Market</span></span>
        </Link>

        <SearchBar searchBase={searchBase} defaultValue={searchDefault} />

        <nav className="site-header__nav">
          {isAuthenticated ? (
            <>
              {showCreateCta && (
                <Link className="site-header__cta" to="/listings/new">
                  Разместить объявление
                </Link>
              )}
              <MessagesLink />
              <UserAvatar size={32} />
            </>
          ) : (
            <>
              <Link className="site-header__link" to="/login">
                Войти
              </Link>
              <Link className="site-header__cta" to="/register">
                Зарегистрироваться
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
