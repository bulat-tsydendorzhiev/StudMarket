import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import RequireAuth from './auth/RequireAuth'
import RequireGuest from './auth/RequireGuest'
import HomePage from './pages/HomePage'
import ListingDetailPage from './pages/ListingDetailPage'
import ListingEditPage from './pages/ListingEditPage'
import ListingNewPage from './pages/ListingNewPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'

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
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route
            path="/listings/:id/edit"
            element={
              <RequireAuth>
                <ListingEditPage />
              </RequireAuth>
            }
          />
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