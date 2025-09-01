// src/services/EnhancedBatchUploadService.js - Simplified for build fix
import { ExtractionService } from './ai/ExtractionService'

class EnhancedBatchUploadService {
  constructor() {
    this.queues = new Map()
    this.workers = new Map()
    this.isInitialized = false
    this.notifications = []
    this.showNotification = null
    this.processedFiles = new Set()
    this.extractionService = ExtractionService
    
    this.init()
  }

  init() {
    if (this.isInitialized) return
    this.isInitialized = true
    console.log('EnhancedBatchUploadService initialized')
  }

  setNotificationFunction(notificationFn) {
    this.showNotification = notificationFn
  }

  notify(message, type = 'info') {
    if (this.showNotification) {
      this.showNotification(message, type)
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`)
    }
  }

  async processBatch(files, documentType = 'pi', options = {}) {
    console.log('Processing batch:', files.length, 'files')
    
    const batchId = `batch_${Date.now()}`
    
    try {
      const results = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`)
        
        try {
          const result = await this.extractionService.extractFromFile(file)
          results.push({
            success: true,
            data: result,
            filename: file.name
          })
        } catch (error) {
          console.error(`Failed to process ${file.name}:`, error)
          results.push({
            success: false,
            error: error.message,
            filename: file.name
          })
        }
      }
      
      const successful = results.filter(r => r.success).length
      const failed = results.filter(r => !r.success).length
      
      this.notify(`Batch completed: ${successful} successful, ${failed} failed`, 'info')
      
      return {
        batchId,
        totalFiles: files.length,
        successful,
        failed,
        results
      }
      
    } catch (error) {
      console.error('Batch processing failed:', error)
      this.notify('Batch processing failed', 'error')
      throw error
    }
  }

  async processFile(file, documentType = 'pi', options = {}) {
    try {
      const result = await this.extractionService.extractFromFile(file)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('File processing failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  getBatchStatus(batchId) {
    return {
      status: 'completed',
      progress: 100,
      results: []
    }
  }

  getAllBatches() {
    return []
  }

  clearProcessedFiles() {
    this.processedFiles.clear()
    console.log('Processed files cleared')
  }
}

const enhancedBatchUploadService = new EnhancedBatchUploadService()
export default enhancedBatchUploadService
