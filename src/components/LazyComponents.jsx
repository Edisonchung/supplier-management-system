// src/components/LazyComponents.jsx - UPDATED with Smart Product Sync Dashboard + Image Generation Dashboard

import { lazy } from 'react';
import React, { Suspense } from 'react';

// Loading Component
const LoadingSpinner = ({ componentName = "Component" }) => (
  <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-md">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading {componentName}...</p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Please wait</p>
    </div>
  </div>
);

// Lazy Wrapper Component
export const LazyWrapper = ({ children, componentName = "Component" }) => (
  <Suspense fallback={<LoadingSpinner componentName={componentName} />}>
    {children}
  </Suspense>
);

// ========== EXISTING LAZY IMPORTS ========== 

// Core Management Components
export const LazyDashboard = lazy(() => import('./dashboard/Dashboard'));
export const LazySuppliers = lazy(() => import('./suppliers/Suppliers'));
export const LazyProducts = lazy(() => import('./products/Products'));
export const LazyClients = lazy(() => import('./clients/Clients'));

// Procurement Components
export const LazyProformaInvoices = lazy(() => import('./procurement/ProformaInvoices'));
export const LazyPurchaseOrders = lazy(() => import('./purchase-orders/PurchaseOrders'));
export const LazyClientInvoices = lazy(() => import('./invoices/ClientInvoices'));

// Tools & Utilities
export const LazyQuickImport = lazy(() => import('./import/QuickImport'));
export const LazySmartNotifications = lazy(() => import('./notifications/SmartNotifications'));

// ========== NEW: PHASE 2B ANALYTICS COMPONENTS ========== 

// HiggsFlow Analytics Phase 2B Dashboard - PRIMARY ANALYTICS COMPONENT
export const LazyHiggsFlowAnalyticsDashboard = lazy(() => 
  import('./analytics/HiggsFlowAnalyticsDashboard').catch(() => {
    console.warn('HiggsFlowAnalyticsDashboard not found, using placeholder');
    return {
      default: () => (
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-lg shadow-md">
          <div className="text-center p-8">
            <div className="mx-auto h-16 w-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              HiggsFlow Analytics Phase 2B
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Advanced Business Intelligence Dashboard
            </p>
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              Component will be available after installation
            </div>
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              Expected features: Real-time Analytics • Business Intelligence • Performance Metrics
            </div>
          </div>
        </div>
      )
    };
  })
);

// Legacy Analytics Dashboard (for backward compatibility)
export const LazyAnalyticsDashboard = lazy(() => 
  import('./AnalyticsDashboard').catch(() => {
    console.warn('AnalyticsDashboard not found, redirecting to HiggsFlow Analytics');
    return import('./analytics/HiggsFlowAnalyticsDashboard').catch(() => ({
      default: () => (
        <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-md">
          <div className="text-center p-8">
            <div className="mx-auto h-12 w-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Legacy Analytics
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Component not found. Please use the new HiggsFlow Analytics Phase 2B dashboard.
            </p>
          </div>
        </div>
      )
    }));
  })
);

// ========== ADDITIONAL EXISTING COMPONENTS ========== 

// E-commerce Components
export const LazyPublicCatalog = lazy(() => import('./ecommerce/PublicCatalog'));
export const LazySmartPublicCatalog = lazy(() => import('./SmartPublicCatalog'));
export const LazyProductDetailPage = lazy(() => import('./ecommerce/ProductDetailPage'));
export const LazyFactoryRegistration = lazy(() => import('./ecommerce/FactoryRegistration'));
export const LazyShoppingCart = lazy(() => import('./ecommerce/ShoppingCart'));
export const LazyQuoteRequest = lazy(() => import('./ecommerce/QuoteRequest'));
export const LazyFactoryLogin = lazy(() => import('./ecommerce/FactoryLogin'));
export const LazyFactoryDashboard = lazy(() => import('./ecommerce/FactoryDashboard'));

// Advanced Management Components
export const LazySourcingDashboard = lazy(() => import('./sourcing/SourcingDashboard'));
export const LazySupplierMatchingPage = lazy(() => import('./supplier-matching/SupplierMatchingPage'));
export const LazyTeamManagement = lazy(() => import('./team/TeamManagement'));
export const LazyUnifiedTrackingDashboard = lazy(() => import('./tracking/UnifiedTrackingDashboard'));
export const LazyMigrationPage = lazy(() => import('./migration/MigrationPage'));

// Admin Components
export const LazyCompanyStructureManager = lazy(() => import('./admin/CompanyStructureManager'));
export const LazyCategoryManagementDashboard = lazy(() => import('./admin/CategoryManagementDashboard'));

// NEW: Smart Product Sync Dashboard
export const LazySmartProductSyncDashboard = lazy(() => 
  import('./admin/SmartProductSyncDashboard').catch(() => {
    console.warn('SmartProductSyncDashboard not found, using placeholder');
    return {
      default: () => (
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-lg shadow-md">
          <div className="text-center p-8">
            <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Smart Product Sync Dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Manage product sync between internal inventory and public catalog
            </p>
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              Component will be available after installation
            </div>
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              Expected features: Product Sync Control • Pricing Management • Bulk Operations
            </div>
          </div>
        </div>
      )
    };
  })
);

// MCP & AI Components
export const LazyMCPTools = lazy(() => import('./mcp/MCPTools'));
export const LazyDualSystemDashboard = lazy(() => import('./mcp/DualSystemDashboard'));
export const LazyPromptManagement = lazy(() => import('./mcp/PromptManagement'));

// NEW: Image Generation Dashboard
export const LazyImageGenerationDashboard = lazy(() => 
  import('./mcp/ImageGenerationDashboard').catch((error) => {
    console.warn('ImageGenerationDashboard failed to load:', error);
    return {
      default: () => (
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 rounded-lg shadow-md">
          <div className="text-center p-8">
            <div className="mx-auto h-16 w-16 bg-pink-100 dark:bg-pink-900 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              AI Image Generation Dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Monitor and manage OpenAI-powered product image generation
            </p>
            <div className="text-sm text-pink-600 dark:text-pink-400 font-medium">
              Component loading failed - using fallback
            </div>
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              Expected features: Image Generation Stats • System Health • Generation History
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm transition-colors"
            >
              Reload Component
            </button>
          </div>
        </div>
      )
    };
  })
);

// Landing Page
export const LazyHiggsFlowLandingPage = lazy(() => import('./HiggsFlowLandingPage'));

// ========== COMPONENT REGISTRY FOR DEBUGGING ========== 

export const componentRegistry = {
  // Core Management
  'Dashboard': LazyDashboard,
  'Suppliers': LazySuppliers,
  'Products': LazyProducts,
  'Clients': LazyClients,
  
  // Procurement
  'Proforma Invoices': LazyProformaInvoices,
  'Purchase Orders': LazyPurchaseOrders,
  'Client Invoices': LazyClientInvoices,
  
  // Analytics - Phase 2B
  'HiggsFlow Analytics Dashboard': LazyHiggsFlowAnalyticsDashboard,
  'Analytics Dashboard': LazyAnalyticsDashboard,
  
  // E-commerce
  'Public Catalog': LazyPublicCatalog,
  'Smart Public Catalog': LazySmartPublicCatalog,
  'Product Details': LazyProductDetailPage,
  'Factory Registration': LazyFactoryRegistration,
  'Shopping Cart': LazyShoppingCart,
  'Quote Request': LazyQuoteRequest,
  'Factory Login': LazyFactoryLogin,
  'Factory Dashboard': LazyFactoryDashboard,
  
  // Advanced Features
  'Sourcing Dashboard': LazySourcingDashboard,
  'Supplier Matching': LazySupplierMatchingPage,
  'Team Management': LazyTeamManagement,
  'Tracking Dashboard': LazyUnifiedTrackingDashboard,
  'Migration': LazyMigrationPage,
  'Smart Notifications': LazySmartNotifications,
  'Quick Import': LazyQuickImport,
  
  // Admin
  'Company Structure Manager': LazyCompanyStructureManager,
  'Category Management': LazyCategoryManagementDashboard,
  'Smart Product Sync Dashboard': LazySmartProductSyncDashboard,
  
  // MCP & AI
  'MCP Tools': LazyMCPTools,
  'Dual System Dashboard': LazyDualSystemDashboard,
  'Prompt Management': LazyPromptManagement,
  'Image Generation Dashboard': LazyImageGenerationDashboard,
  
  // Landing
  'HiggsFlow Landing Page': LazyHiggsFlowLandingPage,
};

// Debug function for development
export const getAvailableComponents = () => {
  return Object.keys(componentRegistry);
};

// Enhanced LazyWrapper with error boundary
export const EnhancedLazyWrapper = ({ children, componentName = "Component", fallback }) => (
  <Suspense 
    fallback={fallback || <LoadingSpinner componentName={componentName} />}
  >
    <div data-component={componentName}>
      {children}
    </div>
  </Suspense>
);

export default {
  LazyWrapper,
  EnhancedLazyWrapper,
  LoadingSpinner,
  componentRegistry,
  getAvailableComponents
};
