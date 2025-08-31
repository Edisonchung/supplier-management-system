// vite.config.js - UPDATED WITH CONSOLE MANAGEMENT AND PERFORMANCE OPTIMIZATIONS
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // Automatically inject React import
      jsxImportSource: 'react',
      jsxRuntime: 'automatic'
    }),
    
    // CUSTOM PLUGIN: Remove console logs in production build
    {
      name: 'remove-console-logs',
      transform(code, id) {
        if (process.env.NODE_ENV === 'production') {
          // Remove console.log, console.debug, console.info
          // Keep console.error and console.warn for critical issues
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
    // Enable code splitting and chunk optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react'],
          
          // Feature-based chunks (only load when needed)
          'suppliers-chunk': ['./src/components/suppliers/Suppliers.jsx'],
          'products-chunk': ['./src/components/products/Products.jsx'],
          'procurement-chunk': ['./src/components/procurement/ProformaInvoices.jsx'],
          'purchase-orders-chunk': ['./src/components/purchase-orders/PurchaseOrders.jsx'],
          'invoices-chunk': ['./src/components/invoices/ClientInvoices.jsx'],
          
          // ADDED: E-commerce chunk for catalog
          'catalog-chunk': ['./src/components/ecommerce/ProductCard.jsx'],
        }
      },
      
      // ADDED: External dependencies handling
      external: (id) => {
        // Don't bundle these large dependencies
        return id.includes('node_modules') && (
          id.includes('firebase') ||
          id.includes('chart.js') ||
          id.includes('pdf')
        )
      }
    },
    
    // Enhanced minification for production
    minify: 'esbuild',
    
    // UPDATED: Reduced chunk size warning limit
    chunkSizeWarningLimit: 300,
    
    // ADDED: Source map generation for debugging
    sourcemap: false, // Disable in production for faster builds
    
    // ADDED: Asset optimization
    assetsDir: 'assets',
    
    // ADDED: CSS code splitting
    cssCodeSplit: true,
    
    // ADDED: Build target optimization
    target: 'es2020'
  },
  
  // Enhanced dependency optimization
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'lucide-react',
      'react-router-dom'
    ],
    exclude: [
      // Exclude large dependencies from pre-bundling
      'firebase',
      '@firebase/firestore',
      'chart.js'
    ],
    
    // ADDED: Force optimize these problematic deps
    force: true
  },

  // UPDATED: Enhanced global definitions
  define: {
    global: 'globalThis',
    
    // ADDED: Environment-specific optimizations
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
    
    // ADDED: Console management flags
    __SUPPRESS_CONSOLE__: JSON.stringify(process.env.NODE_ENV === 'production'),
    
    // ADDED: Performance monitoring
    __ENABLE_PERFORMANCE_TRACKING__: JSON.stringify(process.env.NODE_ENV === 'development')
  },
  
  // ADDED: Server configuration for development
  server: {
    // Reduce HMR noise in development
    hmr: {
      overlay: true
    },
    
    // ADDED: Proxy configuration if needed for API calls
    proxy: {
      '/api': {
        target: 'https://your-backend-url.com',
        changeOrigin: true,
        secure: true
      }
    }
  },
  
  // ADDED: Preview server configuration
  preview: {
    port: 4173,
    strictPort: true
  },
  
  // ADDED: Performance optimizations
  esbuild: {
    // Remove console logs at build time
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    
    // Optimize for modern browsers
    target: 'es2020'
  },
  
  // ADDED: CSS preprocessing optimizations
  css: {
    // PostCSS optimizations
    postcss: {
      plugins: [
        // Add autoprefixer if you have it installed
        // require('autoprefixer')
      ]
    },
    
    // CSS modules configuration
    modules: {
      // Optimize class name generation
      generateScopedName: process.env.NODE_ENV === 'production' 
        ? '[hash:base64:5]' 
        : '[name]__[local]__[hash:base64:5]'
    }
  },
  
  // ADDED: Worker configuration
  worker: {
    format: 'es'
  }
})
