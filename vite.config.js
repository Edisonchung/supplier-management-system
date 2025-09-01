// vite.config.js - FIXED VERSION: Removed problematic external config
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: 'react',
      jsxRuntime: 'automatic'
    }),
    
    // CUSTOM PLUGIN: Remove console logs in production build
    {
      name: 'remove-console-logs',
      transform(code, id) {
        if (process.env.NODE_ENV === 'production') {
          return {
            code: code
              .replace(/console\.log\([^)]*\);?/g, '')
              .replace(/console\.debug\([^)]*\);?/g, '')
              .replace(/console\.info\([^)]*\);?/g, ''),
            map: null
          }
        }
        return null
      }
    }
  ],
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          'suppliers-chunk': ['./src/components/suppliers/Suppliers.jsx'],
          'products-chunk': ['./src/components/products/Products.jsx'],
          'procurement-chunk': ['./src/components/procurement/ProformaInvoices.jsx'],
          'purchase-orders-chunk': ['./src/components/purchase-orders/PurchaseOrders.jsx'],
          'invoices-chunk': ['./src/components/invoices/ClientInvoices.jsx'],
          'catalog-chunk': ['./src/components/ecommerce/ProductCard.jsx']
        }
      }
      // REMOVED: Problematic external configuration that was causing build failures
    },
    
    minify: 'esbuild',
    chunkSizeWarningLimit: 300,
    sourcemap: false,
    assetsDir: 'assets',
    cssCodeSplit: true,
    target: 'es2020'
  },
  
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'lucide-react',
      'react-router-dom'
    ],
    force: true
  },

  define: {
    global: 'globalThis',
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    __SUPPRESS_CONSOLE__: JSON.stringify(process.env.NODE_ENV === 'production'),
    __ENABLE_PERFORMANCE_TRACKING__: JSON.stringify(process.env.NODE_ENV === 'development')
  },
  
  server: {
    hmr: {
      overlay: true
    }
  },
  
  preview: {
    port: 4173,
    strictPort: true
  },
  
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    target: 'es2020'
  },
  
  css: {
    modules: {
      generateScopedName: process.env.NODE_ENV === 'production' 
        ? '[hash:base64:5]' 
        : '[name]__[local]__[hash:base64:5]'
    }
  },
  
  worker: {
    format: 'es'
  }
})
