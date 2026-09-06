import { Link, useLocation, useNavigate } from 'react-router-dom'

export default function SiteFooter() {
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
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Link className="site-footer__logo" to="/">
              <span className="logo-mark" aria-hidden="true" />
              <span className="site-footer__brand-text">Stud<span className="site-footer__brand-accent">Market</span></span>
            </Link>
            <p className="site-footer__tagline">
              Безопасная студенческая барахолка между студентами.
            </p>
            <a
              className="site-footer__github"
              href="https://github.com/bulat-tsydendorzhiev/StudMarket"
              target="_blank"
              rel="noreferrer"
              aria-label="Проект на GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              <span>GitHub</span>
            </a>
          </div>

          <div className="site-footer__col">
            <p className="site-footer__heading">Сервис</p>
            <div className="site-footer__links">
              <a href="/" onClick={handleListings}>Объявления</a>
              <Link to="/listings/new">Подать объявление</Link>
              <Link to="/#how-it-works">Как это работает</Link>
            </div>
          </div>

          <div className="site-footer__col">
            <p className="site-footer__heading">Помощь</p>
            <div className="site-footer__links">
              <Link to="/about">Безопасность</Link>
              <Link to="/about">Правила сервиса</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="site-footer__bottom-inner">
          <span>Сделано студентами для студентов · 18+</span>
        </div>
      </div>
    </footer>
  )
}
