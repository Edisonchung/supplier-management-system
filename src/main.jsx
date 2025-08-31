// src/main.jsx

if (import.meta.env.PROD) {
  const originalError = console.error;
  const originalWarn = console.warn;
  let errorCount = 0;
  const maxErrors = 20;
  const throttle = new Map();

  console.log = () => {}; // Disable logs in production
  
  console.error = (...args) => {
    if (errorCount++ < maxErrors && !isThrottled(args[0])) {
      originalError(...args);
    }
  };

  console.warn = (...args) => {
    if (errorCount++ < maxErrors && !isThrottled(args[0])) {
      originalWarn(...args);
    }
  };

  function isThrottled(msg) {
    const key = String(msg).substring(0, 30);
    const now = Date.now();
    if (!throttle.get(key) || now - throttle.get(key) > 5000) {
      throttle.set(key, now);
      return false;
    }
    return true;
  }

  // CRITICAL: Suppress image errors that are freezing your page
  document.addEventListener('error', (e) => {
    if (e.target?.tagName === 'IMG') {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);
}


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
