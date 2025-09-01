// src/main.jsx



import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { preloadCriticalComponents, monitorBundleLoading } from './utils/performance.js'

// Monitor performance in development
if (import.meta.env.DEV) {
  monitorBundleLoading()
}

// Preload critical components after initial render
setTimeout(preloadCriticalComponents, 2000)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
