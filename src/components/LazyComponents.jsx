// src/components/LazyComponents.jsx - ENHANCED VERSION
import { lazy, Suspense } from 'react'

// Enhanced loading component with analytics
const LoadingSpinner = ({ componentName = 'Component' }) => {
  React.useEffect(() => {
    const start = performance.now()
    console.log(`⏳ Loading ${componentName}...`)
    
    return () => {
      const end = performance.now()
      console.log(`✅ ${componentName} loaded in ${(end - start).toFixed(2)}ms`)
    }
  }, [componentName])

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
      <span className="ml-3 text-gray-600">Loading {componentName}...</span>
    </div>
  )
}

// Lazy load with performance tracking
const createLazyComponent = (importFn, componentName) => {
  return lazy(() => {
    const start = performance.now()
    return importFn().then(module => {
      const end = performance.now()
      if (import.meta.env.DEV) {
        console.log(`📦 ${componentName} chunk loaded: ${(end - start).toFixed(2)}ms`)
      }
      return module
    })
  })
}

// Enhanced lazy components with tracking
export const LazyDashboard = createLazyComponent(() => import('./dashboard/Dashboard'), 'Dashboard')
export const LazySuppliers = createLazyComponent(() => import('./suppliers/Suppliers'), 'Suppliers')
export const LazyProducts = createLazyComponent(() => import('./products/Products'), 'Products')
export const LazyProformaInvoices = createLazyComponent(() => import('./procurement/ProformaInvoices'), 'ProformaInvoices')
export const LazyPurchaseOrders = createLazyComponent(() => import('./purchase-orders/PurchaseOrders'), 'PurchaseOrders')
export const LazyClientInvoices = createLazyComponent(() => import('./invoices/ClientInvoices'), 'ClientInvoices')

// For components that might exist (with error handling)
export const LazyQuickImport = lazy(() => 
  import('./import/QuickImport').catch(() => ({
    default: () => (
      <div className="p-6 text-center text-gray-500">
        <h2 className="text-xl font-semibold mb-2">Quick Import</h2>
        <p>This feature is coming soon!</p>
      </div>
    )
  }))
)

export const LazyUserManagement = lazy(() => 
  import('./users/UserManagement').catch(() => ({
    default: () => (
      <div className="p-6 text-center text-gray-500">
        <h2 className="text-xl font-semibold mb-2">User Management</h2>
        <p>This feature is coming soon!</p>
      </div>
    )
  }))
)

// Placeholder for delivery tracking
export const LazyDeliveryTracking = lazy(() => Promise.resolve({
  default: () => (
    <div className="p-6 text-center text-gray-500">
      <h2 className="text-xl font-semibold mb-2">Delivery Tracking</h2>
      <p>Real-time shipment tracking and delivery status monitoring</p>
      <div className="mt-4 text-sm">
        <p>🚀 Feature in development</p>
        <p>Expected completion: Q1 2025</p>
      </div>
    </div>
  )
}))

// Enhanced wrapper with component name tracking
export const LazyWrapper = ({ children, componentName, fallback }) => {
  const defaultFallback = <LoadingSpinner componentName={componentName} />
  
  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  )
}
