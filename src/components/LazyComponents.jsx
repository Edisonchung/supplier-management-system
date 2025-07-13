// src/components/LazyComponents.jsx - FIXED VERSION
import React, { lazy, Suspense } from 'react' // ← ADD React import

// Loading component
const LoadingSpinner = ({ componentName = 'Component' }) => {
  React.useEffect(() => {
    const start = performance.now()
    if (import.meta.env.DEV) {
      console.log(`⏳ Loading ${componentName}...`)
    }
    
    return () => {
      const end = performance.now()
      if (import.meta.env.DEV) {
        console.log(`✅ ${componentName} loaded in ${(end - start).toFixed(2)}ms`)
      }
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

// 🔥 NEW: Smart Notifications Component with error handling
export const LazySmartNotifications = lazy(() => 
  import('./notifications/SmartNotifications').catch(() => ({
    default: () => (
      <div className="p-6 text-center text-gray-500">
        <h2 className="text-xl font-semibold mb-2">Smart Notifications</h2>
        <p>AI-powered procurement alerts and notifications</p>
        <div className="mt-4 text-sm">
          <p>🚀 Feature in development</p>
          <p>Expected completion: Q1 2025</p>
        </div>
      </div>
    )
  }))
)

// Loading Component
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// Placeholder Component
const PlaceholderComponent = ({ title, description, icon: Icon, message }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center max-w-md">
      <div className="mx-auto mb-6 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      {message && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">{message}</p>
        </div>
      )}
    </div>
  </div>
);

// Enhanced Lazy Wrapper with Error Boundaries
const LazyWrapper = ({ children, fallback, componentName }) => {
  const fallbackComponent = fallback || <LoadingSpinner message={`Loading ${componentName || 'component'}...`} />;
  
  return (
    <Suspense fallback={fallbackComponent}>
      <ErrorBoundary componentName={componentName}>
        {children}
      </ErrorBoundary>
    </Suspense>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LazyComponent Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Package className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Component Error
            </h3>
            <p className="text-gray-600 mb-4">
              {this.props.componentName ? 
                `There was an error loading ${this.props.componentName}` : 
                'There was an error loading this component'
              }
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export {
  LazyDashboard,
  LazySuppliers,
  LazyProducts,
  LazyProformaInvoices,
  LazyPurchaseOrders,
  LazyClientInvoices,
  LazyQuickImport,
  LazyUserManagement,
  LazySmartNotifications, // 🔥 NEW: Export Smart Notifications
  LazyWrapper,
  LoadingSpinner,
  PlaceholderComponent
};
