// src/components/mcp/index.js
// Main export index for all MCP image generation components

// Main dashboard components
export { default as ImageGenerationDashboard } from './ImageGenerationDashboard';
export { default as ManualImageUpload } from './ManualImageUpload';

// Sub-components
export {
  ImageUploadZone,
  UploadQueue, 
  ImagePreview
} from './components';
