// src/main.jsx - FIXED VERSION: Simplified console management for build stability

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Simplified console management for production
const isProduction = import.meta.env.MODE === 'production'

if (isProduction) {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  let errorCount = 0;
  const maxErrors = 20;
  const throttleMap = new Map();
  const imageErrors = new Set();

  // Disable logs in production
  console.log = () => {}
  console.debug = () => {}
  
  // Throttled error logging
  console.error = (...args) => {
    if (errorCount < maxErrors) {
      const key = String(args[0] || '').substring(0, 30);
      const now = Date.now();
      if (!throttleMap.get(key) || now - throttleMap.get(key) > 5000) {
        throttleMap.set(key, now);
        originalError(...args);
        errorCount++;
      }
    }
  };

  console.warn = (...args) => {
    if (errorCount < maxErrors) {
      const key = String(args[0] || '').substring(0, 30);
      const now = Date.now();
      if (!throttleMap.get(key) || now - throttleMap.get(key) > 5000) {
        throttleMap.set(key, now);
        originalWarn(...args);
        errorCount++;
      }
    }
  };

  // Image error suppression
  document.addEventListener('error', (e) => {
    if (e.target?.tagName === 'IMG') {
      const imgSrc = e.target.src;
      if (!imageErrors.has(imgSrc) && imageErrors.size < 5) {
        imageErrors.add(imgSrc);
        originalWarn(`Image failed: ${imgSrc.substring(0, 50)}...`);
      }
      e.stopPropagation();
      e.preventDefault();
      return false;
    }
  }, true);

  // Global error handlers
  window.addEventListener('error', (event) => {
    if (event.target?.tagName === 'IMG') return;
    if (errorCount < maxErrors) {
      originalError('Global error:', {
        message: event.error?.message || event.message,
        filename: event.filename,
        line: event.lineno
      });
      errorCount++;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (errorCount < maxErrors) {
      originalError('Unhandled rejection:', event.reason);
      errorCount++;
    }
    event.preventDefault();
  });

  // Debug functions
  window.restoreConsole = () => {
    console.log = originalError;
    console.warn = originalWarn;
    console.error = originalError;
    console.log('Console restored for debugging');
  };

  window.getErrorStats = () => ({
    errorCount,
    throttledMessages: throttleMap.size,
    uniqueImageErrors: imageErrors.size,
    maxErrors
  });
}

// Performance utilities
const performanceUtils = {
  preloadCriticalComponents: async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const criticalComponents = [
        () => import('./components/ecommerce/ProductCard.jsx'),
        () => import('./components/suppliers/Suppliers.jsx'),
        () => import('./components/products/Products.jsx')
      ];

      criticalComponents.forEach((loader, index) => {
        setTimeout(() => {
          loader().catch(err => {
            if (!isProduction) {
              console.warn(`Failed to preload component ${index}:`, err);
            }
          });
        }, 1000 * (index + 1));
      });
    } catch (error) {
      if (!isProduction) {
        console.warn('Preload error:', error);
      }
    }
  },

  monitorBundleLoading: () => {
    if (isProduction || typeof window === 'undefined') return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            console.log('Navigation timing:', {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              totalTime: entry.loadEventEnd - entry.fetchStart
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }

    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      const failedResources = resources.filter(resource => 
        resource.transferSize === 0 && resource.decodedBodySize === 0
      );
      
      if (failedResources.length > 0) {
        console.warn(`Failed to load ${failedResources.length} resources:`, 
          failedResources.map(r => r.name));
      }
    });
  }
};

// Enhanced error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary:', error, errorInfo);
    
    if (isProduction) {
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 5000);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
            HiggsFlow Application Error
          </h1>
          <p style={{ marginBottom: '20px', maxWidth: '500px' }}>
            The application encountered an error. This may be due to network issues or temporary server problems.
          </p>
          <div>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginRight: '10px',
                fontSize: '16px'
              }}
            >
              Refresh Page
            </button>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Try Again
            </button>
          </div>
          {!isProduction && this.state.error && (
            <details style={{ 
              marginTop: '30px', 
              textAlign: 'left',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '800px'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Error Details (Development)
              </summary>
              <pre style={{ 
                background: '#f3f4f6', 
                padding: '15px', 
                borderRadius: '5px',
                overflow: 'auto',
                fontSize: '12px',
                marginTop: '10px'
              }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// App wrapper
const AppWithEnhancements = () => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      performanceUtils.preloadCriticalComponents();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

// Performance monitoring
if (!isProduction) {
  performanceUtils.monitorBundleLoading();
  performance.mark('higgsflow-init-start');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithEnhancements />
  </React.StrictMode>
);

if (!isProduction) {
  performance.mark('higgsflow-init-end');
  performance.measure('higgsflow-init', 'higgsflow-init-start', 'higgsflow-init-end');
}
