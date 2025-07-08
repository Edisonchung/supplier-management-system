// src/utils/errorHandling.js
// Error handling utilities for the application

/**
 * Get user-friendly error message from an error object
 * @param {Error|string|any} error - The error to process
 * @returns {string} User-friendly error message
 */
export function getErrorMessage(error) {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If it has a message property, use it
  if (error?.message) {
    return error.message;
  }

  // If it has a response with data (API error)
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  // If it has a response with statusText
  if (error?.response?.statusText) {
    return `Error: ${error.response.statusText}`;
  }

  // Default error message
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log error to console with context
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 */
export function logError(context, error) {
  console.error(`[${context}]`, error);
  
  // In production, you might want to send this to an error tracking service
  if (import.meta.env.PROD) {
    // TODO: Send to error tracking service like Sentry
  }
}

/**
 * Create a user-friendly error object
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {any} details - Additional error details
 * @returns {object} Error object
 */
export function createError(message, code = 'UNKNOWN_ERROR', details = null) {
  return {
    message,
    code,
    details,
    timestamp: new Date().toISOString()
  };
}

/**
 * Handle API errors and return appropriate messages
 * @param {Error} error - API error
 * @returns {string} User-friendly error message
 */
export function handleAPIError(error) {
  // Network errors
  if (!error.response) {
    return 'Network error. Please check your internet connection.';
  }

  // HTTP status code errors
  const status = error.response?.status;
  
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input.';
    case 401:
      return 'Authentication required. Please log in.';
    case 403:
      return 'Access denied. You do not have permission.';
    case 404:
      return 'Resource not found.';
    case 413:
      return 'File too large. Please upload a smaller file.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return getErrorMessage(error);
  }
}

/**
 * Validate file upload errors
 * @param {File} file - File to validate
 * @param {object} options - Validation options
 * @returns {object} Validation result
 */
export function validateFile(file, options = {}) {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB default
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'xls', 'xlsx']
  } = options;

  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
    return { isValid: false, error: `File size exceeds ${sizeMB}MB limit` };
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    // Check extension as fallback
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return { isValid: false, error: 'File type not supported' };
    }
  }

  return { isValid: true };
}

/**
 * Format error for display in UI
 * @param {any} error - Error to format
 * @returns {object} Formatted error object
 */
export function formatErrorForUI(error) {
  const message = getErrorMessage(error);
  const isNetworkError = !error.response && error.request;
  const isValidationError = error.response?.status === 400;
  
  return {
    message,
    type: isNetworkError ? 'network' : isValidationError ? 'validation' : 'error',
    showRetry: isNetworkError || error.response?.status >= 500,
    details: error.response?.data?.details || null
  };
}

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  FILE_TOO_LARGE: 'File size is too large. Please upload a smaller file.',
  INVALID_FILE_TYPE: 'Invalid file type. Please upload a supported file format.',
  EXTRACTION_FAILED: 'Failed to extract data from the document.',
  NO_DATA_EXTRACTED: 'No data could be extracted from the document.',
  INVALID_DOCUMENT: 'The document format is not recognized.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.'
};

export default {
  getErrorMessage,
  logError,
  createError,
  handleAPIError,
  validateFile,
  formatErrorForUI,
  ERROR_MESSAGES
};
