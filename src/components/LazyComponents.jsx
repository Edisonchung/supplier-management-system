// src/components/LazyComponents.jsx
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

// Add placeholder components for modules that might not exist yet
export const LazyDeliveryTracking = lazy(() => 
  import('./delivery/DeliveryTracking').catch(() => ({
    default: () => <div className="p-6 text-center text-gray-500">Delivery Tracking - Coming Soon</div>
  }))
)

export const LazyQuickImport = lazy(() => 
  import('./import/QuickImport').catch(() => ({
    default: () => <div className="p-6 text-center text-gray-500">Quick Import - Coming Soon</div>
  }))
)

export const LazyUserManagement = lazy(() => 
  import('./users/UserManagement').catch(() => ({
    default: () => <div className="p-6 text-center text-gray-500">User Management - Coming Soon</div>
  }))
)

// Wrapper component with consistent loading
export const LazyWrapper = ({ children, fallback = <LoadingSpinner /> }) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
)
