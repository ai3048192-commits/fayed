import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App' // تم إزالة .tsx هنا لتفادي بعض مشاكل التصدير مع Vite

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)