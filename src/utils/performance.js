// src/utils/performance.js (CREATE THIS FILE)
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
    console.log(`📦 ${componentName} loaded in ${(end - start).toFixed(2)}ms`)
    return component
  })
}

// Monitor bundle loading performance
export const monitorBundleLoading = () => {
  if (process.env.NODE_ENV === 'development') {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          console.log('📊 Bundle Performance Metrics:', {
            'DOM Content Loaded': `${(entry.domContentLoadedEventEnd - entry.fetchStart).toFixed(0)}ms`,
            'Page Load Complete': `${(entry.loadEventEnd - entry.fetchStart).toFixed(0)}ms`,
            'Time to Interactive': `${(entry.loadEventEnd - entry.fetchStart).toFixed(0)}ms`
          })
        }
      })
    })
    
    observer.observe({ entryTypes: ['navigation'] })
    
    // Monitor chunk loading
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('chunk') || (entry.name.includes('.js') && entry.transferSize > 1000)) {
          console.log(`📦 Chunk: ${entry.name.split('/').pop()}`, {
            'Size': `${(entry.transferSize / 1024).toFixed(2)}KB`,
            'Load Time': `${entry.duration.toFixed(2)}ms`
          })
        }
      })
    })
    
    resourceObserver.observe({ entryTypes: ['resource'] })
    
    return () => {
      observer.disconnect()
      resourceObserver.disconnect()
    }
  }
}

// Track bundle size improvement
export const trackBundleImprovement = () => {
  const originalSize = 292 * 1024 // 292KB baseline
  
  // This would be called after measuring actual bundle size
  return {
    calculateImprovement: (newSize) => {
      const reduction = originalSize - newSize
      const percentage = (reduction / originalSize * 100).toFixed(1)
      
      console.log(`🎯 Bundle Optimization Results:`, {
        'Original Size': `${(originalSize / 1024).toFixed(2)}KB`,
        'New Size': `${(newSize / 1024).toFixed(2)}KB`,
        'Reduction': `${(reduction / 1024).toFixed(2)}KB`,
        'Improvement': `${percentage}%`
      })
      
      return { reduction, percentage, newSize, originalSize }
    }
  }
}
