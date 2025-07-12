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
