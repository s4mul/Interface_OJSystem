import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AdminRoutes from './admin/AdminRoutes.jsx'

const isAdminPath = /^\/admin(?:\/|$)/.test(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdminPath ? <AdminRoutes /> : <App />}
  </StrictMode>,
)
