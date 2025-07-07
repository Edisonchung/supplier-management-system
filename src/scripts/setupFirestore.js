// src/scripts/setupFirestore.js
// Run this once to set up your Firestore structure

import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

const setupFirestoreCollections = async () => {
  console.log('🚀 Setting up Firestore collections...');

  try {
    // 1. Create collection references (collections are created when first document is added)
    const collections = [
      'users',
      'suppliers', 
      'products',
      'proformaInvoices',
      'purchaseOrders',
      'clientInvoices',
      'deliveries',
      'settings',
      'activityLogs'
    ];

    // 2. Create initial documents to establish collections
    
    // System settings
    await setDoc(doc(db, 'settings', 'system'), {
      companyName: 'HiggsFlow',
      version: '1.1.0',
      setupDate: serverTimestamp(),
      features: {
        aiExtraction: true,
        emailNotifications: false,
        advancedReporting: false
      }
    });

    // Sample supplier (can be deleted later)
    await addDoc(collection(db, 'suppliers'), {
      name: 'Sample Supplier Co.',
      email: 'sample@supplier.com',
      phone: '+1234567890',
      address: '123 Demo Street',
      contactPerson: 'John Demo',
      status: 'active',
      createdAt: serverTimestamp(),
      createdBy: 'system',
      metadata: {
        isDemo: true
      }
    });

    // Sample product
    await addDoc(collection(db, 'products'), {
      name: 'Sample Product',
      brand: 'Demo Brand',
      category: 'electronics',
      sku: 'DEMO-001',
      price: 100,
      stock: 50,
      minStock: 10,
      status: 'pending',
      supplierId: 'sample-supplier',
      createdAt: serverTimestamp(),
      createdBy: 'system',
      metadata: {
        isDemo: true
      }
    });

    // Activity log entry
    await addDoc(collection(db, 'activityLogs'), {
      action: 'system_setup',
      description: 'Initial Firestore setup completed',
      userId: 'system',
      timestamp: serverTimestamp(),
      metadata: {
        collections: collections
      }
    });

    console.log('✅ Firestore collections created successfully!');
    
    // 3. Create composite indexes (do this in Firebase Console)
    console.log('\n⚠️  IMPORTANT: Create these composite indexes in Firebase Console:');
    console.log('1. suppliers: status ASC, createdAt DESC');
    console.log('2. products: supplierId ASC, status ASC, createdAt DESC');
    console.log('3. proformaInvoices: supplierId ASC, status ASC, date DESC');
    console.log('4. purchaseOrders: status ASC, date DESC');
    console.log('5. activityLogs: userId ASC, timestamp DESC');

  } catch (error) {
    console.error('❌ Error setting up Firestore:', error);
  }
};

// Data migration helper
export const migrateFromLocalStorage = async () => {
  console.log('🔄 Starting data migration from localStorage...');
  
  try {
    // Migrate suppliers
    const localSuppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
    for (const supplier of localSuppliers) {
      const { id, ...supplierData } = supplier;
      await addDoc(collection(db, 'suppliers'), {
        ...supplierData,
        migratedAt: serverTimestamp(),
        migratedFrom: 'localStorage'
      });
    }
    console.log(`✅ Migrated ${localSuppliers.length} suppliers`);

    // Migrate products
    const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
    for (const product of localProducts) {
      const { id, ...productData } = product;
      await addDoc(collection(db, 'products'), {
        ...productData,
        migratedAt: serverTimestamp(),
        migratedFrom: 'localStorage'
      });
    }
    console.log(`✅ Migrated ${localProducts.length} products`);

    // Add more collections as needed...

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
};

// Run setup
setupFirestoreCollections();
