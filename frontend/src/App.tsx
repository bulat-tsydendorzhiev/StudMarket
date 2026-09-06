import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import RequireGuest from './auth/RequireGuest'
import HomePage from './pages/HomePage'
import ChatListPage from './pages/ChatListPage'
import ChatPage from './pages/ChatPage'
import ListingDetailPage from './pages/ListingDetailPage'
import ListingEditPage from './pages/ListingEditPage'
import ListingNewPage from './pages/ListingNewPage'
import ListingPaymentPage from './pages/ListingPaymentPage'
import LoginPage from './pages/LoginPage'
import MyListingsPage from './pages/MyListingsPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import RegisterPage from './pages/RegisterPage'
import AboutPage from './pages/AboutPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/listings/new"
            element={
              <RequireAuth>
                <ListingNewPage />
              </RequireAuth>
            }
          />
          <Route
            path="/listings/payment"
            element={
              <RequireAuth>
                <ListingPaymentPage />
              </RequireAuth>
            }
          />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <ChatListPage />
              </RequireAuth>
            }
          />
          <Route
            path="/chat/:conversationId"
            element={
              <RequireAuth>
                <ChatPage />
              </RequireAuth>
            }
          />
          <Route
            path="/listings/:id/edit"
            element={
              <RequireAuth>
                <ListingEditPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/my-listings"
            element={
              <RequireAuth>
                <MyListingsPage />
              </RequireAuth>
            }
          />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/login"
            element={
              <RequireGuest>
                <LoginPage />
              </RequireGuest>
            }
          />
          <Route
            path="/register"
            element={
              <RequireGuest>
                <RegisterPage />
              </RequireGuest>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}