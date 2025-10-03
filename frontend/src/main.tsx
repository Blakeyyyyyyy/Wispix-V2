import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Health check before rendering the app
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000'

async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_URL}/health`)
    if (!response.ok) throw new Error('API health check failed')
    return true
  } catch (error) {
    console.error('API health check failed:', error)
    return false
  }
}

async function bootstrap() {
  const isHealthy = await checkAPIHealth()
  
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App apiHealthy={isHealthy} />
    </React.StrictMode>
  )
}

bootstrap()
