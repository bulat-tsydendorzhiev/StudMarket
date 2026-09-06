import type { CurrentUser } from '../auth/AuthContext'
import { apiClient } from './client'

export interface ProfileUpdate {
  username?: string
  email?: string
  current_password?: string
  new_password?: string
  avatar_path?: string | null
}

export const profileApi = {
  update: (payload: ProfileUpdate) =>
    apiClient.patch<CurrentUser>('/auth/profile', payload),
}