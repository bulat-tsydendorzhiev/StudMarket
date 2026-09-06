import { Link } from 'react-router-dom'
import MessagesLink from '../components/MessagesLink'
import UserAvatar from '../components/UserAvatar'

export default function ListingPaymentPage() {
  return (
    <div className="payment">
      <header className="payment__header">
        <Link className="payment__logo" to="/">
          StudMarket
        </Link>
        <MessagesLink />
        <UserAvatar />
      </header>

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