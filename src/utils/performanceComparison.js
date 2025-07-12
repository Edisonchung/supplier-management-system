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
