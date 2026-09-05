const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { method: 'GET', ...options }),
  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { method: 'POST', ...(body !== undefined ? { body: JSON.stringify(body) } : {}), ...options }),
  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { method: 'PATCH', ...(body !== undefined ? { body: JSON.stringify(body) } : {}), ...options }),
  put: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<T>(path, { method: 'PUT', ...(body !== undefined ? { body: JSON.stringify(body) } : {}), ...options }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { method: 'DELETE', ...options }),
}