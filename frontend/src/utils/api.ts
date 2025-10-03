// API utility functions
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000'

export const apiUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`

export const apiFetch = (endpoint: string, options?: RequestInit) => {
  return fetch(apiUrl(endpoint), options)
}
