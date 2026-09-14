import axios from 'axios'

const TOKEN_KEY = 'atelier_v2_token'
const PRINCIPAL_KEY = 'atelier_v2_principal'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const rawPrincipal = localStorage.getItem(PRINCIPAL_KEY)
      const isAtelier = rawPrincipal ? JSON.parse(rawPrincipal).principalType === 'atelier' : false
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(PRINCIPAL_KEY)
      window.location.href = isAtelier ? '/v2/login-atelie' : '/v2/login'
    }
    return Promise.reject(error)
  }
)

export { TOKEN_KEY, PRINCIPAL_KEY }
