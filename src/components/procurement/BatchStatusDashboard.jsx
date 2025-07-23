import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Play, 
  RotateCcw, 
  Trash2,
  Eye,
  Download,
  AlertTriangle,
  Cpu,
  Users,
  FileText,
  TrendingUp
} from 'lucide-react';
import enhancedBatchUploadService from '../../services/EnhancedBatchUploadService';

const BatchStatusDashboard = ({ isOpen, onClose }) => {
  const [activeBatches, setActiveBatches] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(3000);

  // Real-time updates
  useEffect(() => {
    if (!isOpen) return;

    const updateData = () => {
      const batches = enhancedBatchUploadService.getActiveBatches();
      const stats = enhancedBatchUploadService.getStatistics();
      
      setActiveBatches(batches);
      setStatistics(stats);
    };

    // Initial load
    updateData();

    // Set up real-time polling
    const interval = setInterval(updateData, refreshInterval);
    return () => clearInterval(interval);
  }, [isOpen, refreshInterval]);

  const handleRetryBatch = (batchId) => {
    enhancedBatchUploadService.retryFailedFiles(batchId);
  };

  const handleCancelBatch = (batchId) => {
    if (window.confirm('Are you sure you want to cancel this batch?')) {
      enhancedBatchUploadService.cancelBatch(batchId);
    }
  };

  const handleViewBatchDetails = (batch) => {
    setSelectedBatch(batch);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'cancelled':
        return <Pause className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end - start;
    
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold">Batch Processing Dashboard</h2>
              <p className="text-sm text-gray-600">
                Real-time monitoring of AI extraction batches
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value={1000}>1s refresh</option>
              <option value={3000}>3s refresh</option>
              <option value={5000}>5s refresh</option>
              <option value={10000}>10s refresh</option>
            </select>
            
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex h-[calc(95vh-80px)]">
          {/* Statistics Sidebar */}
          <div className="w-80 bg-gray-50 border-r p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">System Overview</h3>
              
              <div className="space-y-4">
                {/* Active Processing */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">Active Batches</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {statistics.activeBatches || 0}
                    </span>
                  </div>
                  {statistics.activeWorkers > 0 && (
                    <div className="text-sm text-gray-600 mt-1">
                      {statistics.activeWorkers} Web Workers running
                    </div>
                  )}
                </div>

                {/* Processing Stats */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Processing Stats</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Files:</span>
                      <span className="font-medium">{statistics.totalFiles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Processed:</span>
                      <span className="font-medium">{statistics.processedFiles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Successful:</span>
                      <span className="font-medium text-green-600">{statistics.successfulFiles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Failed:</span>
                      <span className="font-medium text-red-600">{statistics.failedFiles || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Success Rate */}
                {statistics.processedFiles > 0 && (
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-medium">Success Rate</span>
                    </div>
                    
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round((statistics.successfulFiles / statistics.processedFiles) * 100)}%
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(statistics.successfulFiles / statistics.processedFiles) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* System Capabilities */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center space-x-2 mb-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">Capabilities</span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Web Workers:</span>
                      <span className={`font-medium ${statistics.webWorkerSupported ? 'text-green-600' : 'text-red-600'}`}>
                        {statistics.webWorkerSupported ? 'Supported' : 'Not Available'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Background Processing:</span>
                      <span className="font-medium text-green-600">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Auto-save:</span>
                      <span className="font-medium text-blue-600">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedBatch ? (
              /* Batch Details View */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSelectedBatch(null)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ← Back to Dashboard
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedBatch.status)}`}>
                      {selectedBatch.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {selectedBatch.processingMethod}
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                  <h3 className="text-lg font-medium mb-4">
                    Batch {selectedBatch.id.split('_')[1]} Details
                  </h3>
                  
                  {/* Progress Overview */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Overall Progress</span>
                      <span>{selectedBatch.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${selectedBatch.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                      <span>{selectedBatch.processedFiles}/{selectedBatch.totalFiles} files</span>
                      <span>
                        {selectedBatch.estimatedTimeRemaining > 0 
                          ? `ETA: ${Math.round(selectedBatch.estimatedTimeRemaining / 60)}min`
                          : 'Complete'
                        }
                      </span>
                    </div>
                  </div>

                  {/* File List */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Files ({selectedBatch.files.length})</h4>
                    <div className="max-h-96 overflow-y-auto space-y-1">
                      {selectedBatch.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                        >
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(file.status)}
                            <div>
                              <div className="font-medium text-sm">{file.name}</div>
                              {file.error && (
                                <div className="text-xs text-red-600">{file.error}</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(file.status)}`}>
                              {file.status}
                            </span>
                            {file.progress > 0 && file.progress < 100 && (
                              <span className="text-xs text-gray-500">{file.progress}%</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Batch List View */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Active Batches</h3>
                  {activeBatches.length > 0 && (
                    <div className="text-sm text-gray-600">
                      {activeBatches.length} batch{activeBatches.length > 1 ? 'es' : ''} active
                    </div>
                  )}
                </div>

                {activeBatches.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Batches</h3>
                    <p className="text-gray-600">
                      All batch processing is complete. Start a new batch upload to see real-time progress here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeBatches.map((batch) => (
                      <div key={batch.id} className="bg-white rounded-lg border p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(batch.status)}
                            <div>
                              <h4 className="font-medium">
                                Batch {batch.id.split('_')[1]}
                              </h4>
                              <div className="text-sm text-gray-600">
                                Created {formatDuration(batch.createdAt)} ago
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(batch.status)}`}>
                              {batch.status}
                            </span>
                            
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleViewBatchDetails(batch)}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              
                              {batch.failedFiles > 0 && (
                                <button
                                  onClick={() => handleRetryBatch(batch.id)}
                                  className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded"
                                  title="Retry Failed"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              
                              {batch.status === 'processing' && (
                                <button
                                  onClick={() => handleCancelBatch(batch.id)}
                                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded"
                                  title="Cancel Batch"
                                >
                                  <Pause className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progress: {batch.processedFiles}/{batch.totalFiles} files</span>
                            <span>{batch.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${batch.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Status Summary */}
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span>{batch.successfulFiles} Success</span>
                            </span>
                            {batch.failedFiles > 0 && (
                              <span className="flex items-center space-x-1">
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span>{batch.failedFiles} Failed</span>
                              </span>
                            )}
                            <span className="text-gray-500">
                              via {batch.processingMethod}
                            </span>
                          </div>
                          
                          {batch.estimatedTimeRemaining > 0 && (
                            <span className="text-gray-600">
                              ETA: {Math.round(batch.estimatedTimeRemaining / 60)}min
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchStatusDashboard;
