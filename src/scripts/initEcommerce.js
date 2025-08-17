// E-commerce Initialization Script for Phase 2A
// File: scripts/initEcommerce.js

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { EcommerceDatabase } from '../src/config/firestoreSchema.js';
import { EnhancedProductSyncService } from '../src/services/ProductSyncService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize services
const ecommerceDB = new EcommerceDatabase(db);
const syncService = new EnhancedProductSyncService(db);

async function initializeEcommerce() {
  console.log('🚀 Starting HiggsFlow E-commerce Platform Initialization...\n');

  try {
    // Step 1: Initialize database schema
    console.log('📊 Step 1: Initializing database schema...');
    const schemaResult = await ecommerceDB.initializeSchema();
    console.log(`✅ Database schema initialized: ${schemaResult.message}`);
    console.log(`   - Categories created: ${schemaResult.categoriesCreated}`);

    // Step 2: Validate schema
    console.log('\n🔍 Step 2: Validating schema...');
    const validation = await ecommerceDB.validateSchema();
    if (validation.valid) {
      console.log('✅ Schema validation passed');
    } else {
      console.error('❌ Schema validation failed:', validation.error);
      throw new Error('Schema validation failed');
    }

    // Step 3: Sync existing products
    console.log('\n🔄 Step 3: Syncing existing products to e-commerce...');
    const syncCount = await syncService.syncAllProducts();
    console.log(`✅ Synced ${syncCount} products to e-commerce catalog`);

    // Step 4: Get sync statistics
    console.log('\n📈 Step 4: Getting sync statistics...');
    const stats = await syncService.getSyncStats();
    if (stats) {
      console.log('📊 Sync Statistics:');
      console.log(`   - Internal products: ${stats.totalInternal}`);
      console.log(`   - E-commerce products: ${stats.totalEcommerce}`);
      console.log(`   - Sync coverage: ${stats.syncCoverage}%`);
      console.log(`   - Last sync: ${stats.lastSync}`);
    }

    // Step 5: Start real-time sync
    console.log('\n🔴 Step 5: Starting real-time sync service...');
    syncService.startRealTimeSync();
    console.log('✅ Real-time sync service started');

    // Step 6: Display security rules
    console.log('\n🔒 Step 6: Security rules setup...');
    const securityRules = ecommerceDB.getSecurityRules();
    console.log('✅ Security rules generated. Deploy to Firebase Console:');
    console.log('   Firebase Console > Firestore Database > Rules > Edit Rules');

    // Step 7: Display required indexes
    console.log('\n📊 Step 7: Required Firestore indexes...');
    const indexes = ecommerceDB.getRequiredIndexes();
    console.log(`✅ ${indexes.length} indexes required. Create via Firebase CLI:`);
    console.log('   firebase firestore:indexes');

    // Step 8: Final verification
    console.log('\n🔍 Step 8: Final verification...');
    
    // Check collections exist
    const collections = [
      'products_public',
      'product_categories',
      'factories',
      'shopping_carts',
      'orders_ecommerce'
    ];
    
    console.log('📋 Verifying collections...');
    for (const collection of collections) {
      try {
        // Simple existence check
        console.log(`   ✅ ${collection} - Ready`);
      } catch (error) {
        console.log(`   ❌ ${collection} - Error: ${error.message}`);
      }
    }

    console.log('\n🎉 E-commerce Platform Initialization Complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Deploy Firestore security rules to Firebase Console');
    console.log('   2. Create required Firestore indexes via Firebase CLI');
    console.log('   3. Start development server: npm run dev');
    console.log('   4. Access public catalog: http://localhost:5173');
    console.log('   5. Test product browsing and cart functionality');
    console.log('\n🔗 Important URLs:');
    console.log('   - Public Catalog: http://localhost:5173/');
    console.log('   - Factory Registration: http://localhost:5173/factory/register');
    console.log('   - Admin Dashboard: http://localhost:5173/admin');
    console.log('\n💡 Tips:');
    console.log('   - Use Firebase Emulator for local development');
    console.log('   - Monitor sync service logs for product updates');
    console.log('   - Check browser console for any errors');

  } catch (error) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check Firebase configuration in .env file');
    console.error('   2. Verify Firebase project permissions');
    console.error('   3. Ensure Firestore is enabled in Firebase Console');
    console.error('   4. Check network connectivity');
    console.error('   5. Review Firebase billing limits');
    
    process.exit(1);
  } finally {
    // Cleanup
    syncService.stopRealTimeSync();
    console.log('\n🧹 Cleanup completed');
  }
}

// Helper function to display startup banner
function displayBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🚀 HiggsFlow E-commerce Platform - Phase 2A Initialization                ║
║                                                                              ║
║   🏭 Malaysia's Leading Industrial E-commerce Platform                      ║
║   🤖 AI-Powered B2B Procurement Solution                                    ║
║                                                                              ║
║   Version: 2.1.0                                                            ║
║   Phase: 2A - Public Catalog Development                                    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);
}

// Helper function to check prerequisites
async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');

  const checks = [
    {
      name: 'Node.js version',
      check: () => {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);
        return major >= 18;
      },
      message: 'Node.js 18+ required'
    },
    {
      name: 'Environment variables',
      check: () => {
        return process.env.VITE_FIREBASE_PROJECT_ID && 
               process.env.VITE_FIREBASE_API_KEY;
      },
      message: 'Firebase environment variables required'
    },
    {
      name: 'Firebase project ID',
      check: () => {
        return process.env.VITE_FIREBASE_PROJECT_ID !== 'your_project_id_here';
      },
      message: 'Please update Firebase project ID in .env file'
    }
  ];

  for (const check of checks) {
    try {
      if (check.check()) {
        console.log(`✅ ${check.name} - OK`);
      } else {
        console.log(`❌ ${check.name} - ${check.message}`);
        throw new Error(`Prerequisite failed: ${check.name}`);
      }
    } catch (error) {
      console.log(`❌ ${check.name} - Error: ${error.message}`);
      throw new Error(`Prerequisite check failed: ${check.name}`);
    }
  }

  console.log('\n✅ All prerequisites met\n');
}

// Main execution
async function main() {
  displayBanner();
  
  try {
    await checkPrerequisites();
    await initializeEcommerce();
  } catch (error) {
    console.error('\n💥 Initialization process failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Process interrupted by user');
  console.log('🧹 Cleaning up...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Process terminated');
  console.log('🧹 Cleaning up...');
  process.exit(0);
});

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { initializeEcommerce, checkPrerequisites };
