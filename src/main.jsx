// src/main.jsx - ENHANCED CONSOLE MANAGEMENT + PERFORMANCE MONITORING

// Enhanced console management with better error handling
if (import.meta.env.PROD) {
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  
  let errorCount = 0;
  const maxErrors = 20;
  const throttle = new Map();
  const imageErrorSet = new Set(); // Track unique image errors

  console.log = () => {}; // Disable logs in production
  console.debug = () => {}; // Disable debug in production
  
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

  console.info = (...args) => {
    // Allow critical info messages through
    const message = String(args[0] || '');
    if (message.includes('Firebase') || message.includes('Auth') || message.includes('Error')) {
      if (!isThrottled(args[0])) {
        originalInfo(...args);
      }
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

  // ENHANCED: Image error suppression with better tracking
  document.addEventListener('error', (e) => {
    if (e.target?.tagName === 'IMG') {
      const imgSrc = e.target.src;
      
      // Only log unique image errors once to prevent spam
      if (!imageErrorSet.has(imgSrc)) {
        imageErrorSet.add(imgSrc);
        
        // Log only the first few unique image errors
        if (imageErrorSet.size <= 5) {
          originalWarn(`Image failed to load: ${imgSrc.substring(0, 50)}...`);
        }
      }
      
      // CRITICAL: Prevent error propagation that causes console spam
      e.stopPropagation();
      e.preventDefault();
      return false;
    }
  }, true);

  // Enhanced global error handler
  window.addEventListener('error', (event) => {
    // Skip image errors (handled above)
    if (event.target?.tagName === 'IMG') return;
    
    if (errorCount < maxErrors) {
      const errorInfo = {
        message: event.error?.message || event.message,
        filename: event.filename,
        line: event.lineno
      };
      originalError('Global error:', errorInfo);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (errorCount < maxErrors) {
      originalError('Unhandled promise rejection:', event.reason);
    }
    event.preventDefault();
  });

  // Expose debug functions for production troubleshooting
  window.restoreConsole = () => {
    console.log = originalError; // Restore as error level for visibility
    console.warn = originalWarn;
    console.error = originalError;
    console.info = originalInfo;
    console.log('Console restored for debugging');
  };

  window.getErrorStats = () => ({
    errorCount,
    throttledMessages: throttle.size,
    uniqueImageErrors: imageErrorSet.size,
    maxErrors
  });
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Enhanced performance utilities with error handling
const performanceUtils = {
  preloadCriticalComponents: async () => {
    try {
      // Preload critical components for faster navigation
      const criticalComponents = [
        () => import('./components/ecommerce/ProductCard.jsx'),
        () => import('./components/suppliers/Suppliers.jsx'),
        () => import('./components/products/Products.jsx')
      ];

      // Preload components with delay to not block initial render
      for (const [index, loader] of criticalComponents.entries()) {
        setTimeout(() => {
          loader().catch(err => {
            if (!import.meta.env.PROD) {
              console.warn(`Failed to preload component ${index}:`, err);
            }
          });
        }, 1000 * (index + 1));
      }
    } catch (error) {
      if (!import.meta.env.PROD) {
        console.warn('Preload components error:', error);
      }
    }
  },

  monitorBundleLoading: () => {
    if (!import.meta.env.PROD) {
      // Monitor bundle loading performance
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            console.log(`Navigation timing:`, {
              domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
              loadComplete: entry.loadEventEnd - entry.loadEventStart,
              totalTime: entry.loadEventEnd - entry.fetchStart
            });
          }
        }
      });
      
      try {
        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }

      // Monitor resource loading
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
  }
};

// Monitor performance in development
if (import.meta.env.DEV) {
  performanceUtils.monitorBundleLoading();
}

// Enhanced error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
    
    // In production, try to recover after a delay
    if (import.meta.env.PROD) {
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
            The catalog encountered an error. This may be due to network issues or temporary server problems.
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
          {import.meta.env.DEV && this.state.error && (
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

// App wrapper with enhanced error handling
const AppWithEnhancements = () => {
  React.useEffect(() => {
    // Preload critical components after initial render
    const timer = setTimeout(() => {
      performanceUtils.preloadCriticalComponents();
    }, 2000);

    // Cleanup
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
};

// Performance monitoring
if (import.meta.env.DEV) {
  performance.mark('higgsflow-init-start');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppWithEnhancements />
  </React.StrictMode>
);

if (import.meta.env.DEV) {
  performance.mark('higgsflow-init-end');
  performance.measure('higgsflow-init', 'higgsflow-init-start', 'higgsflow-init-end');
}
