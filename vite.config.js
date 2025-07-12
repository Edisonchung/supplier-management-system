// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
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
        }
      }
    },
    
    // Optimize bundle size
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true
      }
    },
    
    // Chunk size optimization
    chunkSizeWarningLimit: 500 // Warn for chunks > 500KB
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
    exclude: [] // Let Vite handle automatically
  }
})

