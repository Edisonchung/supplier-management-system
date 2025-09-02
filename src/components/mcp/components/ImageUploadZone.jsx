// src/components/mcp/components/ImageUploadZone.jsx
// Drag and drop file upload zone component

import React, { useState, useRef } from 'react';
import { Upload, Image, AlertCircle } from 'lucide-react';

const ImageUploadZone = ({ productId, onFilesSelected, disabled = false, multiple = true }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  const validateFile = (file) => {
    if (!allowedTypes.includes(file.type)) {
      return `Invalid file type. Please upload: ${allowedTypes.map(t => t.split('/')[1]).join(', ').toUpperCase()}`;
    }
    
    if (file.size > maxFileSize) {
      return `File too large. Maximum size is ${maxFileSize / 1024 / 1024}MB`;
    }
    
    return null;
  };

  const validateFiles = (files) => {
    const fileArray = Array.from(files);
    const errors = [];
    
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      }
    }
    
    return errors;
  };

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    
    setError(null);
    
    const errors = validateFiles(files);
    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }
    
    const validFiles = Array.from(files).filter(file => !validateFile(file));
    
    if (validFiles.length === 0) {
      setError('No valid files to upload');
      return;
    }
    
    onFilesSelected(validFiles, productId);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drag over to false if we're leaving the component entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    handleFiles(files);
    
    // Clear the input so the same file can be selected again
    e.target.value = '';
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="space-y-2">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all
          ${disabled 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyPress={handleKeyPress}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Upload images"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        <div className={`space-y-2 ${disabled ? 'text-gray-400' : 'text-gray-600'}`}>
          {isDragOver && !disabled ? (
            <div className="text-blue-600">
              <Upload className="w-6 h-6 mx-auto mb-2" />
              <div className="text-sm font-medium">Drop images here</div>
            </div>
          ) : (
            <>
              <Image className="w-6 h-6 mx-auto" />
              <div className="text-sm">
                {disabled ? (
                  <span>Upload disabled</span>
                ) : (
                  <>
                    <span className="font-medium text-blue-600">Click to upload</span>
                    <span> or drag and drop</span>
                  </>
                )}
              </div>
              {!disabled && (
                <div className="text-xs text-gray-500">
                  PNG, JPG, WEBP up to {maxFileSize / 1024 / 1024}MB
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700 whitespace-pre-line">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadZone;
