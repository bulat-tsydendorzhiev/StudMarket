import { apiClient } from './client'

export interface UserProfile {
  id: string
  username: string
}

export const usersApi = {
  get: (id: string) => apiClient.get<UserProfile>(`/auth/users/${id}`),
}