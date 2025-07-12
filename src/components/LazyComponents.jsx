// src/components/LazyComponents.jsx
import { lazy, Suspense } from 'react'

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
)

// Lazy load ONLY existing components
export const LazyDashboard = lazy(() => import('./dashboard/Dashboard'))
export const LazySuppliers = lazy(() => import('./suppliers/Suppliers'))
export const LazyProducts = lazy(() => import('./products/Products'))
export const LazyProformaInvoices = lazy(() => import('./procurement/ProformaInvoices'))
export const LazyPurchaseOrders = lazy(() => import('./purchase-orders/PurchaseOrders'))
export const LazyClientInvoices = lazy(() => import('./invoices/ClientInvoices'))

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

// Placeholder for delivery tracking (since it doesn't exist yet)
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

// Wrapper component with consistent loading
export const LazyWrapper = ({ children, fallback = <LoadingSpinner /> }) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
)
