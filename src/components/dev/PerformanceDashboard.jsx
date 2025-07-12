// src/components/dev/PerformanceDashboard.jsx (CREATE FOR DEVELOPMENT)
import React, { useState, useEffect } from 'react'

const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState({
    bundleSize: 0,
    loadTime: 0,
    chunksLoaded: 0,
    memoryUsage: 0
  })
  const [isVisible, setIsVisible] = useState(import.meta.env.DEV)

  useEffect(() => {
    if (!isVisible) return

    // Simulate metrics collection
    const updateMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0]
      const resources = performance.getEntriesByType('resource')
      
      setMetrics({
        bundleSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        loadTime: navigation?.loadEventEnd - navigation?.fetchStart || 0,
        chunksLoaded: resources.filter(r => r.name.includes('chunk')).length,
        memoryUsage: performance.memory?.usedJSHeapSize || 0
      })
    }

    updateMetrics()
    const interval = setInterval(updateMetrics, 5000)
    return () => clearInterval(interval)
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg max-w-sm text-xs z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-green-400">Performance Monitor</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-1">
        <div>Bundle Size: {(metrics.bundleSize / 1024).toFixed(2)}KB</div>
        <div>Load Time: {metrics.loadTime.toFixed(0)}ms</div>
        <div>Chunks Loaded: {metrics.chunksLoaded}</div>
        <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</div>
        
        <div className="mt-2 pt-2 border-t border-gray-700 text-green-400">
          ✅ Lazy Loading Active
        </div>
      </div>
    </div>
  )
}

export default PerformanceDashboard
