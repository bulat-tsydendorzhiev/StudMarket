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
