import SiteHeader from '../components/SiteHeader'
import SiteFooter from '../components/SiteFooter'

export default function AboutPage() {
  return (
    <div className="about-page">
      <SiteHeader showCreateCta={false} hideSearch />

      <main className="about-page__main">
        <div className="about-page__container">
          <div className="about-page__hero">
            <p className="about-page__label">StudMarket</p>
            <h1 className="about-page__title">По-соседски и безопасно</h1>
            <p className="about-page__subtitle">
              Мы создаём локальное сообщество, где студенты помогают друг другу и дают вещам вторую жизнь.
            </p>
          </div>

          <div className="about-page__cards">
            <article className="about-page__card">
              <span className="about-page__card-icon">✓</span>
              <h2 className="about-page__card-title">Будь собой</h2>
              <p className="about-page__card-text">
                Указывай настоящие данные и честно описывай состояние вещи.
              </p>
            </article>

            <article className="about-page__card">
              <span className="about-page__card-icon">🔍</span>
              <h2 className="about-page__card-title">Проверяй</h2>
              <p className="about-page__card-text">
                Осмотри вещь при встрече и не переводи предоплату незнакомым.
              </p>
            </article>

            <article className="about-page__card">
              <span className="about-page__card-icon">🤝</span>
              <h2 className="about-page__card-title">Уважай</h2>
              <p className="about-page__card-text">
                Договаривайся заранее, будь вовремя и береги личные границы.
              </p>
            </article>
          </div>

          <article className="about-page__rules">
            <h2 className="about-page__rules-title">Короткие правила сервиса</h2>
            <ol className="about-page__rules-list">
              <li><b>1.</b> Размещай только реальные вещи, которые принадлежат тебе.</li>
              <li><b>2.</b> Запрещены опасные предметы, лекарства, алкоголь и материалы 18+.</li>
              <li><b>3.</b> Встречайся в общих пространствах общежития или кампуса.</li>
            </ol>
          </article>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
