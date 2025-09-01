// src/utils/performance.js - Fixed version
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
    const loadTime = (end - start).toFixed(2)
    console.log(`📦 ${componentName} loaded in ${loadTime}ms`)
    return component
  })
}

// Monitor bundle loading performance
export const monitorBundleLoading = () => {
  if (process.env.NODE_ENV === 'development') {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const domContentTime = (entry.domContentLoadedEventEnd - entry.fetchStart).toFixed(0)
          const pageLoadTime = (entry.loadEventEnd - entry.fetchStart).toFixed(0)
          const interactiveTime = (entry.loadEventEnd - entry.fetchStart).toFixed(0)
          
          console.log('📊 Bundle Performance Metrics:', {
            'DOM Content Loaded': `${domContentTime}ms`,
            'Page Load Complete': `${pageLoadTime}ms`,
            'Time to Interactive': `${interactiveTime}ms`
          })
        }
      })
    })
    
    observer.observe({ entryTypes: ['navigation'] })
    
    // Monitor chunk loading
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('chunk') || (entry.name.includes('.js') && entry.transferSize > 1000)) {
          const size = (entry.transferSize / 1024).toFixed(2)
          const loadTime = entry.duration.toFixed(2)
          const fileName = entry.name.split('/').pop()
          
          console.log(`📦 Chunk: ${fileName}`, {
            'Size': `${size}KB`,
            'Load Time': `${loadTime}ms`
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
      const originalSizeKB = (originalSize / 1024).toFixed(2)
      const newSizeKB = (newSize / 1024).toFixed(2)
      const reductionKB = (reduction / 1024).toFixed(2)
      
      console.log('🎯 Bundle Optimization Results:', {
        'Original Size': `${originalSizeKB}KB`,
        'New Size': `${newSizeKB}KB`,
        'Reduction': `${reductionKB}KB`,
        'Improvement': `${percentage}%`
      })
      
      return { reduction, percentage, newSize, originalSize }
    }
  }
}
