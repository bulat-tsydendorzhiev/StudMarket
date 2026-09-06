import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import SearchBar from './SearchBar'
import MessagesLink from './MessagesLink'
import UserAvatar from './UserAvatar'

interface SiteHeaderProps {
  searchBase?: string
  searchDefault?: string
  showCreateCta?: boolean
  hideSearch?: boolean
}

export default function SiteHeader({ searchBase, searchDefault, showCreateCta = true, hideSearch = false }: SiteHeaderProps) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleListings = (event: React.MouseEvent) => {
    event.preventDefault()
    if (location.pathname === '/') {
      history.scrollRestoration = 'manual'
      window.scrollTo(0, 0)
      window.location.reload()
    } else {
      navigate('/')
    }
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-header__logo" to="/">
          <span className="logo-mark" aria-hidden="true" />
          <span className="site-header__brand">Stud<span className="site-header__brand-accent">Market</span></span>
        </Link>

        <nav className="site-header__links">
          <a href="/" onClick={handleListings}>Объявления</a>
          <Link to="/#how-it-works">Как это работает</Link>
        </nav>

        {!hideSearch && <SearchBar searchBase={searchBase} defaultValue={searchDefault} />}

        <nav className="site-header__nav">
          {isAuthenticated ? (
            <>
              {showCreateCta && (
                <Link className="site-header__cta" to="/listings/new">
                  <span className="site-header__cta-plus" aria-hidden="true">+</span>
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
