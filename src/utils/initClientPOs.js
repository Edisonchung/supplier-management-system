// Create a file: src/utils/initClientPOs.js
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export const initializeClientPOs = async () => {
  try {
    const testPO = {
      clientName: "Test Client Ltd",
      clientPONumber: "TEST-PO-001",
      date: new Date().toISOString(),
      items: [
        {
          id: `item-${Date.now()}`,
          description: "Test Product",
          quantity: 10,
          unitPrice: 100,
          totalPrice: 1000,
          sourcingStatus: "pending"
        }
      ],
      totalAmount: 1000,
      status: "sourcing_required",
      sourcingStatus: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'clientPurchaseOrders'), testPO);
    console.log('Test Client PO created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating test Client PO:', error);
    throw error;
  }
};
