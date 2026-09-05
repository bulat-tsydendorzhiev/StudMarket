import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '../api/client'

export interface CurrentUser {
  id: string
  username: string
  email: string
}

interface AuthContextValue {
  user: CurrentUser | null
  isLoading: boolean
  isAuthenticated: boolean
  authenticate: (user: CurrentUser) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const ME_QUERY_KEY = ['auth', 'me'] as const

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async () => {
      try {
        return await apiClient.get<CurrentUser | null>('/auth/me')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null
        }
        throw error
      }
    },
    retry: false,
  })

  const user = data ?? null

  const authenticate = (authenticatedUser: CurrentUser) => {
    queryClient.setQueryData(ME_QUERY_KEY, authenticatedUser)
  }

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      queryClient.setQueryData(ME_QUERY_KEY, null)
      queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY, refetchType: 'none' })
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: user !== null, authenticate, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}