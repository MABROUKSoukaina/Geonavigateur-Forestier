import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Register tile caching service worker for offline map support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw-tiles.js').catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
