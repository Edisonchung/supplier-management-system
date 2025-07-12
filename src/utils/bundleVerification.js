// =============================================================================
// BUNDLE OPTIMIZATION VERIFICATION & TESTING
// =============================================================================

// 1. VERIFICATION SCRIPT (CREATE THIS FILE)
// =============================================================================

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

// =============================================================================
// 2. TESTING COMPONENT (ADD TO YOUR APP FOR DEVELOPMENT)
// =============================================================================

// src/components/dev/BundleOptimizationTester.jsx (CREATE FOR DEVELOPMENT ONLY)
import React, { useState, useEffect } from 'react'
import { BundleOptimizationVerifier } from '../../utils/bundleVerification'

const BundleOptimizationTester = () => {
  const [verifier] = useState(() => new BundleOptimizationVerifier())
  const [report, setReport] = useState(null)
  const [isVisible, setIsVisible] = useState(process.env.NODE_ENV === 'development')

  useEffect(() => {
    if (!isVisible) return

    const observer = verifier.monitorChunkLoading()
    
    // Generate report after 5 seconds
    const reportTimer = setTimeout(() => {
      const finalReport = verifier.generateReport()
      setReport(finalReport)
    }, 5000)

    return () => {
      observer.disconnect()
      clearTimeout(reportTimer)
    }
  }, [verifier, isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-md text-xs z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Bundle Optimization</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div>Status: Monitoring...</div>
        
        {report && (
          <>
            <div>Bundle Reduction: {report.bundleMetrics.reduction}%</div>
            <div>Chunks Loaded: {report.chunksLoaded}</div>
            <div>Memory Used: {(report.memoryMetrics?.used / 1024 / 1024).toFixed(2)}MB</div>
            
            {report.recommendations.length > 0 && (
              <div className="mt-2 p-2 bg-yellow-900 rounded">
                <div className="font-semibold">Recommendations:</div>
                {report.recommendations.map((rec, index) => (
                  <div key={index}>• {rec}</div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default BundleOptimizationTester

// =============================================================================
// 3. INTEGRATION WITH YOUR APP (TEMPORARY - DEVELOPMENT ONLY)
// =============================================================================

// Add this to your Layout.jsx (ONLY FOR DEVELOPMENT TESTING)
/*
import BundleOptimizationTester from '../dev/BundleOptimizationTester'

// In your Layout component, add at the bottom:
<BundleOptimizationTester />
*/

// =============================================================================
// 4. BEFORE/AFTER COMPARISON SCRIPT
// =============================================================================

// src/utils/performanceComparison.js (CREATE THIS FILE)
export const measurePerformanceImprovement = () => {
  const startTime = performance.now()
  const startMemory = performance.memory?.usedJSHeapSize || 0

  return {
    // Call this after your optimizations
    getResults: () => {
      const endTime = performance.now()
      const endMemory = performance.memory?.usedJSHeapSize || 0
      
      return {
        loadTime: endTime - startTime,
        memoryIncrease: endMemory - startMemory,
        timestamp: new Date().toISOString()
      }
    },
    
    // Compare with baseline
    compareWithBaseline: (baseline) => {
      const current = measurePerformanceImprovement().getResults()
      
      return {
        loadTimeImprovement: baseline.loadTime - current.loadTime,
        memoryImprovement: baseline.memoryIncrease - current.memoryIncrease,
        percentageImprovement: {
          loadTime: ((baseline.loadTime - current.loadTime) / baseline.loadTime * 100).toFixed(1),
          memory: ((baseline.memoryIncrease - current.memoryIncrease) / baseline.memoryIncrease * 100).toFixed(1)
        }
      }
    }
  }
}

// =============================================================================
// 5. QUICK VERIFICATION CHECKLIST
// =============================================================================

/*
AFTER IMPLEMENTING THE OPTIMIZATION, VERIFY:

✅ 1. Build Process:
   - Run `npm run build` - should complete without errors
   - Check dist/ folder - should see multiple chunk files
   - Main bundle should be significantly smaller

✅ 2. Development Testing:
   - Run `npm run dev` 
   - Navigate between pages - should see loading spinners briefly
   - Check browser Network tab - should see chunks loading on demand

✅ 3. Performance Testing:
   - Open Chrome DevTools > Network tab
   - Reload page and check "JS" filter
   - Initial load should be much smaller
   - Subsequent page visits should load additional chunks

✅ 4. Bundle Analysis:
   - Run `npm run analyze` (if you added the script)
   - Should see visual breakdown of chunks
   - Vendor chunks should be separate from feature chunks

✅ 5. Browser Console:
   - Should see performance monitoring logs in development
   - Should see chunk loading information
   - No errors related to lazy loading

EXPECTED IMPROVEMENTS:

Before Optimization:
- Single bundle: ~292KB
- Initial load: ~2-3 seconds on 3G
- All features loaded upfront

After Optimization:
- Main bundle: ~80KB
- Feature chunks: 20-40KB each
- Initial load: ~1-1.5 seconds on 3G
- Features load on-demand

TROUBLESHOOTING:

If you encounter issues:
1. Check browser console for import errors
2. Verify all file paths in LazyComponents.jsx
3. Ensure all components have default exports
4. Check that vite.config.js is properly formatted
5. Clear browser cache and try again
*/

// =============================================================================
// 6. QUICK TEST COMMANDS
// =============================================================================

/*
Run these commands to verify optimization:

1. Check current bundle size:
   npm run build
   ls -lah dist/assets/

2. Analyze bundle composition:
   npm run analyze

3. Test development performance:
   npm run dev
   (Open browser dev tools and monitor Network tab)

4. Check for any build warnings:
   npm run build 2>&1 | grep -i warning

5. Verify chunk splitting worked:
   find dist -name "*.js" | wc -l
   (Should show multiple JS files, not just one)
*/
