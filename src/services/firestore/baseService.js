// src/services/firestore/baseService.js
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export class BaseFirestoreService {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  // Create document
  async create(data) {
    try {
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(this.collectionRef, docData);
      return {
        id: docRef.id,
        ...docData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Get single document
  async getById(id) {
    try {
      const docRef = doc(this.collectionRef, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error getting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Get all documents
  async getAll(queryConstraints = []) {
    try {
      const q = query(this.collectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting all ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Update document
  async update(id, data) {
    try {
      const docRef = doc(this.collectionRef, id);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
      return {
        id,
        ...updateData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Delete document
  async delete(id) {
    try {
      const docRef = doc(this.collectionRef, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Real-time listener - UPDATED to accept onNext and onError callbacks
  subscribe(queryConstraints = [], onNext, onError) {
    try {
      const q = query(this.collectionRef, ...queryConstraints);
      
      return onSnapshot(
        q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          onNext(data);
        },
        (error) => {
          console.error(`Error in ${this.collectionName} subscription:`, error);
          if (onError) {
            onError(error);
          }
        }
      );
    } catch (error) {
      console.error(`Error setting up ${this.collectionName} subscription:`, error);
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }

  // Search documents
  async search(field, searchTerm) {
    try {
      // For simple search - in production, consider using Algolia or ElasticSearch
      const q = query(
        this.collectionRef,
        where(field, '>=', searchTerm),
        where(field, '<=', searchTerm + '\uf8ff')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error searching ${this.collectionName}:`, error);
      throw error;
    }
  }
}
