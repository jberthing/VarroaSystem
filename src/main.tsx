import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Register service worker with update prompt
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Ny version tilgængelig! Vil du opdatere nu?')) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App klar til offline brug')
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
