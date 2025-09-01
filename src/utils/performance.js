// src/utils/performance.js
// Minimal build-safe performance utilities

export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('../components/suppliers/Suppliers.jsx').catch(() => {});
      import('../components/products/Products.jsx').catch(() => {});
    });
  }
};

export const measureComponentLoad = (componentName, loadPromise) => {
  const start = performance.now();
  
  return loadPromise.then(component => {
    const end = performance.now();
    const duration = end - start;
    console.log('Component ' + componentName + ' loaded in ' + duration.toFixed(2) + 'ms');
    return component;
  });
};

export const monitorBundleLoading = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.entryType === 'navigation') {
          const domTime = entry.domContentLoadedEventEnd - entry.fetchStart;
          const loadTime = entry.loadEventEnd - entry.fetchStart;
          
          console.log('Bundle Performance:', {
            'DOM': Math.round(domTime) + 'ms',
            'Load': Math.round(loadTime) + 'ms'
          });
        }
      }
    });
    
    observer.observe({ entryTypes: ['navigation'] });
    
    return () => {
      observer.disconnect();
    };
  } catch (error) {
    console.warn('Performance monitoring not available');
    return () => {};
  }
};

export const trackBundleImprovement = () => {
  const originalSize = 292 * 1024;
  
  return {
    calculateImprovement: (newSize) => {
      const reduction = originalSize - newSize;
      const percentage = (reduction / originalSize * 100).toFixed(1);
      
      console.log('Bundle Results:', {
        'Original': Math.round(originalSize / 1024) + 'KB',
        'New': Math.round(newSize / 1024) + 'KB',
        'Improvement': percentage + '%'
      });
      
      return { reduction, percentage, newSize, originalSize };
    }
  };
};
