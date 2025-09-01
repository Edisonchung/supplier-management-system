// src/utils/performance.js
// Performance monitoring utilities - Build Safe Version

export const preloadCriticalComponents = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      import('../components/suppliers/Suppliers.jsx').catch(err => console.warn('Preload failed:', err));
      import('../components/products/Products.jsx').catch(err => console.warn('Preload failed:', err));
    });
  }
};

export const measureComponentLoad = (componentName, loadPromise) => {
  const start = performance.now();
  
  return loadPromise.then(component => {
    const end = performance.now();
    const duration = (end - start).toFixed(2);
    console.log(`Component ${componentName} loaded in ${duration}ms`);
    return component;
  });
};

export const monitorBundleLoading = () => {
  if (process.env.NODE_ENV === 'development') {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const domTime = (entry.domContentLoadedEventEnd - entry.fetchStart).toFixed(0);
          const loadTime = (entry.loadEventEnd - entry.fetchStart).toFixed(0);
          
          console.log('Bundle Performance Metrics:', {
            'DOM Content Loaded': domTime + 'ms',
            'Page Load Complete': loadTime + 'ms',
            'Time to Interactive': loadTime + 'ms'
          });
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation'] });
    
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('chunk') || (entry.name.includes('.js') && entry.transferSize > 1000)) {
          const size = (entry.transferSize / 1024).toFixed(2);
          const duration = entry.duration.toFixed(2);
          
          console.log(`Chunk: ${entry.name.split('/').pop()}`, {
            'Size': size + 'KB',
            'Load Time': duration + 'ms'
          });
        }
      });
    });
    
    resourceObserver.observe({ entryTypes: ['resource'] });
    
    return () => {
      observer.disconnect();
      resourceObserver.disconnect();
    };
  }
};

export const trackBundleImprovement = () => {
  const originalSize = 292 * 1024;
  
  return {
    calculateImprovement: (newSize) => {
      const reduction = originalSize - newSize;
      const percentage = (reduction / originalSize * 100).toFixed(1);
      
      const origSizeKB = (originalSize / 1024).toFixed(2);
      const newSizeKB = (newSize / 1024).toFixed(2);
      const reductionKB = (reduction / 1024).toFixed(2);
      
      console.log('Bundle Optimization Results:', {
        'Original Size': origSizeKB + 'KB',
        'New Size': newSizeKB + 'KB',
        'Reduction': reductionKB + 'KB',
        'Improvement': percentage + '%'
      });
      
      return { reduction, percentage, newSize, originalSize };
    }
  };
};
