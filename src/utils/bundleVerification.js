// src/utils/bundleVerification.js (CREATE THIS NEW FILE)
export class BundleOptimizationVerifier {
  constructor() {
    this.startTime = performance.now()
    this.metrics = {
      initialBundleSize: 0,
      chunksLoaded: [],
      loadTimes: {},
      memoryUsage: []
    }
  }

  // Verify lazy loading is working
  verifyLazyLoading() {
    console.log('🔍 Verifying Lazy Loading...')
    
    // Check if components are actually lazy loaded
    const lazyComponents = [
      'Dashboard', 'Suppliers', 'Products', 
      'ProformaInvoices', 'PurchaseOrders', 'ClientInvoices'
    ]
    
    lazyComponents.forEach(component => {
      const isLoaded = document.querySelector(`[data-component="${component}"]`)
      console.log(`${component}: ${isLoaded ? '✅ Loaded' : '⏳ Not loaded (good!)'}`)
    })
  }

  // Monitor chunk loading
  monitorChunkLoading() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('chunk') || entry.name.includes('.js')) {
          this.metrics.chunksLoaded.push({
            name: entry.name,
            size: entry.transferSize,
            loadTime: entry.duration
          })
          
          console.log(`📦 Chunk loaded: ${entry.name}`, {
            size: `${(entry.transferSize / 1024).toFixed(2)}KB`,
            time: `${entry.duration.toFixed(2)}ms`
          })
        }
      })
    })
    
    observer.observe({ entryTypes: ['resource'] })
    return observer
  }

  // Check bundle size reduction
  calculateBundleSizeReduction() {
    const totalSize = this.metrics.chunksLoaded.reduce((sum, chunk) => sum + chunk.size, 0)
    console.log(`📊 Total Bundle Size: ${(totalSize / 1024).toFixed(2)}KB`)
    
    // Estimate reduction (based on original 292KB)
    const originalSize = 292 * 1024 // 292KB in bytes
    const reduction = ((originalSize - totalSize) / originalSize * 100).toFixed(1)
    console.log(`📉 Bundle Size Reduction: ${reduction}%`)
    
    return { totalSize, reduction }
  }

  // Memory usage tracking
  trackMemoryUsage() {
    if (performance.memory) {
      const memory = {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      }
      
      this.metrics.memoryUsage.push({
        ...memory,
        timestamp: Date.now()
      })
      
      console.log(`🧠 Memory Usage: ${(memory.used / 1024 / 1024).toFixed(2)}MB`)
      return memory
    }
  }

  // Generate optimization report
  generateReport() {
    const report = {
      optimizationTime: performance.now() - this.startTime,
      bundleMetrics: this.calculateBundleSizeReduction(),
      memoryMetrics: this.trackMemoryUsage(),
      chunksLoaded: this.metrics.chunksLoaded.length,
      recommendations: this.generateRecommendations()
    }
    
    console.log('📋 Optimization Report:', report)
    return report
  }

  generateRecommendations() {
    const recommendations = []
    
    // Check for large chunks
    const largeChunks = this.metrics.chunksLoaded.filter(chunk => chunk.size > 100 * 1024)
    if (largeChunks.length > 0) {
      recommendations.push('Consider further splitting large chunks')
    }
    
    // Check load times
    const slowChunks = this.metrics.chunksLoaded.filter(chunk => chunk.loadTime > 500)
    if (slowChunks.length > 0) {
      recommendations.push('Some chunks are loading slowly - check network or CDN')
    }
    
    return recommendations
  }
}
