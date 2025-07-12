// =============================================================================
// STEP 1: IMMEDIATE BUNDLE OPTIMIZATION - IMPLEMENTATION GUIDE
// =============================================================================

// 1. UPDATE vite.config.js (REPLACE YOUR CURRENT FILE)
// =============================================================================

// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  build: {
    // Enable code splitting and chunk optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          
          // Feature-based chunks (only load when needed)
          'suppliers-chunk': ['./src/components/suppliers/Suppliers.jsx'],
          'products-chunk': ['./src/components/products/Products.jsx'],
          'procurement-chunk': ['./src/components/procurement/ProformaInvoices.jsx'],
          'purchase-orders-chunk': ['./src/components/purchase-orders/PurchaseOrders.jsx'],
          'invoices-chunk': ['./src/components/invoices/ClientInvoices.jsx'],
        }
      }
    },
    
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    
    // Chunk size optimization
    chunkSizeWarningLimit: 500 // Warn for chunks > 500KB
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
    exclude: [] // Let Vite handle automatically
  }
})

// =============================================================================
// 2. CREATE LAZY LOADING COMPONENTS (NEW FILE)
// =============================================================================

// src/components/LazyComponents.jsx (CREATE THIS NEW FILE)
import { lazy, Suspense } from 'react'

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
)

// Lazy load all major components
export const LazyDashboard = lazy(() => import('./dashboard/Dashboard'))
export const LazySuppliers = lazy(() => import('./suppliers/Suppliers'))
export const LazyProducts = lazy(() => import('./products/Products'))
export const LazyProformaInvoices = lazy(() => import('./procurement/ProformaInvoices'))
export const LazyPurchaseOrders = lazy(() => import('./purchase-orders/PurchaseOrders'))
export const LazyClientInvoices = lazy(() => import('./invoices/ClientInvoices'))

// Wrapper component with consistent loading
export const LazyWrapper = ({ children, fallback = <LoadingSpinner /> }) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
)

// =============================================================================
// 3. UPDATE YOUR MAIN App.jsx (REPLACE CURRENT ROUTING SECTION)
// =============================================================================

// src/App.jsx - UPDATED VERSION
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/common/Layout'
import LoginForm from './components/auth/LoginForm'
import { 
  LazyDashboard, 
  LazySuppliers, 
  LazyProducts, 
  LazyProformaInvoices,
  LazyPurchaseOrders,
  LazyClientInvoices,
  LazyWrapper 
} from './components/LazyComponents'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Login Route */}
          <Route path="/login" element={<LoginForm />} />
          
          {/* Protected Routes with Lazy Loading */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route 
                    path="/" 
                    element={
                      <LazyWrapper>
                        <LazyDashboard />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/suppliers" 
                    element={
                      <LazyWrapper>
                        <LazySuppliers />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/products" 
                    element={
                      <LazyWrapper>
                        <LazyProducts />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/proforma-invoices" 
                    element={
                      <LazyWrapper>
                        <LazyProformaInvoices />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/purchase-orders" 
                    element={
                      <LazyWrapper>
                        <LazyPurchaseOrders />
                      </LazyWrapper>
                    } 
                  />
                  <Route 
                    path="/client-invoices" 
                    element={
                      <LazyWrapper>
                        <LazyClientInvoices />
                      </LazyWrapper>
                    } 
                  />
                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App

// =============================================================================
// 4. OPTIMIZE TAILWIND CSS (UPDATE YOUR tailwind.config.js)
// =============================================================================

// tailwind.config.js - REPLACE YOUR CURRENT FILE
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Only include colors you actually use
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
  
  // Enable production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    purge: {
      enabled: true,
      content: [
        './src/**/*.{js,jsx,ts,tsx}',
        './index.html',
      ],
      // Keep essential classes
      safelist: [
        'bg-red-100', 'text-red-800',
        'bg-green-100', 'text-green-800', 
        'bg-yellow-100', 'text-yellow-800',
        'bg-blue-100', 'text-blue-800',
        'bg-gray-50', 'bg-gray-100', 'bg-gray-200',
      ]
    }
  })
}

// =============================================================================
// 5. ADD BUNDLE ANALYSIS SCRIPTS (UPDATE package.json)
// =============================================================================

/*
Add these scripts to your package.json:

{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:analyze": "vite build && npx vite-bundle-analyzer dist",
    "preview": "vite preview",
    "analyze": "npm run build:analyze"
  }
}
*/

// =============================================================================
// 6. IMMEDIATE PERFORMANCE IMPROVEMENTS (NEW FILE)
// =============================================================================

// src/utils/performance.js (CREATE THIS NEW FILE)
// Preload critical components during idle time
export const preloadCriticalComponents = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Preload commonly accessed components
      import('../components/suppliers/Suppliers.jsx')
      import('../components/products/Products.jsx')
    })
  }
}

// Measure component load times
export const measureComponentLoad = (componentName, loadPromise) => {
  const start = performance.now()
  
  return loadPromise.then(component => {
    const end = performance.now()
    console.log(`${componentName} loaded in ${(end - start).toFixed(2)}ms`)
    return component
  })
}

// Monitor bundle loading
export const monitorBundleLoading = () => {
  if (process.env.NODE_ENV === 'development') {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          console.log('📊 Bundle Performance:', {
            'DOM Content Loaded': `${(entry.domContentLoadedEventEnd - entry.fetchStart).toFixed(0)}ms`,
            'Page Load Complete': `${(entry.loadEventEnd - entry.fetchStart).toFixed(0)}ms`,
            'First Paint': `${(entry.responseEnd - entry.requestStart).toFixed(0)}ms`
          })
        }
      })
    })
    
    observer.observe({ entryTypes: ['navigation'] })
    
    return () => observer.disconnect()
  }
}

// =============================================================================
// 7. UPDATE YOUR MAIN.JSX (ADD PERFORMANCE MONITORING)
// =============================================================================

// src/main.jsx - ADD TO YOUR EXISTING FILE
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { preloadCriticalComponents, monitorBundleLoading } from './utils/performance.js'

// Monitor performance in development
if (process.env.NODE_ENV === 'development') {
  monitorBundleLoading()
}

// Preload critical components after initial render
setTimeout(preloadCriticalComponents, 2000)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// =============================================================================
// 8. IMMEDIATE IMPLEMENTATION STEPS
// =============================================================================

/*
STEP-BY-STEP IMPLEMENTATION:

1. ✅ UPDATE vite.config.js with the new configuration above
2. ✅ CREATE src/components/LazyComponents.jsx 
3. ✅ UPDATE src/App.jsx with lazy loading routes
4. ✅ UPDATE tailwind.config.js for CSS optimization
5. ✅ CREATE src/utils/performance.js for monitoring
6. ✅ UPDATE src/main.jsx to add performance monitoring
7. ✅ UPDATE package.json to add bundle analysis scripts

TESTING:

After implementation:
1. Run `npm run dev` - check everything still works
2. Run `npm run build` - check build succeeds 
3. Run `npm run analyze` - see bundle size improvements
4. Check Chrome DevTools Network tab - see smaller chunks loading

EXPECTED RESULTS:

Before: 292KB main bundle
After: ~150KB main bundle + smaller lazy chunks

Initial page load: Only loads Dashboard + Layout (~80KB)
Other pages: Load on-demand (20-40KB each)
*/
