import { Link } from 'react-router-dom'
import SiteHeader from '../components/SiteHeader'

export default function ListingPaymentPage() {
  return (
    <div className="payment">
      <SiteHeader />

      <main className="payment__main">
        <div className="payment__card">
          <h1 className="payment__title">Оплата размещения</h1>
          <p className="payment__text">
            Вы выбрали размещение объявления на 30 дней. Это платная опция: чтобы
            объявление появилось на сайте, нужно оплатить размещение.
          </p>
          <p className="payment__text">
            Отсканируйте QR-код в приложении вашего банка и оплатите размещение.
          </p>
          <div className="payment__qr">
            <img src="/payment-qr.webp" alt="QR-код для оплаты" />
          </div>
          <Link className="payment__home" to="/">
            На главную
          </Link>
        </div>
      </main>
    </div>
  )
}
