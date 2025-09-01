import { db } from '../config/firebase.js'
import { collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, setDoc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore'

const cleanFirestoreData = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj
  const cleaned = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    if (value === null) {
      cleaned[key] = null
    } else if (Array.isArray(value)) {
      cleaned[key] = value.filter(item => item !== undefined)
    } else if (typeof value === 'object' && !(value instanceof Date)) {
      const nested = cleanFirestoreData(value)
      if (Object.keys(nested).length > 0) cleaned[key] = nested
    } else {
      cleaned[key] = value
    }
  }
  return cleaned
}

const handleFirestoreOperation = async (operation, operationName) => {
  try {
    const result = await operation()
    return { success: true, data: result }
  } catch (error) {
    console.error(`${operationName} failed:`, error)
    return { success: false, error: error.message }
  }
}

export const safeGetDocument = async (collectionName, docId) => {
  return handleFirestoreOperation(async () => {
    const docRef = doc(db, collectionName, docId)
    const docSnap = await getDoc(docRef)
    return {
      exists: docSnap.exists(),
      data: docSnap.exists() ? docSnap.data() : null,
      id: docSnap.exists() ? docSnap.id : null
    }
  }, `getDocument(${collectionName}/${docId})`)
}

export const safeAddDocument = async (collectionName, data) => {
  return handleFirestoreOperation(async () => {
    const collectionRef = collection(db, collectionName)
    const cleanData = cleanFirestoreData({
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    const docRef = await addDoc(collectionRef, cleanData)
    return { id: docRef.id }
  }, `addDocument(${collectionName})`)
}

export const safeUpdateDocument = async (collectionName, docId, updates) => {
  return handleFirestoreOperation(async () => {
    const docRef = doc(db, collectionName, docId)
    const cleanUpdates = cleanFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    })
    await updateDoc(docRef, cleanUpdates)
    return { id: docId }
  }, `updateDocument(${collectionName}/${docId})`)
}

export const safeGetCollection = async (collectionName, queryConstraints = []) => {
  return handleFirestoreOperation(async () => {
    const collectionRef = collection(db, collectionName)
    const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
  }, `getCollection(${collectionName})`)
}

export const getProformaInvoices = async () => {
  const result = await safeGetCollection('proformaInvoices')
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  }
}

export const addProformaInvoice = async (invoice) => {
  const result = await safeAddDocument('proformaInvoices', invoice)
  if (result.success) {
    return {
      success: true,
      data: { id: result.data.id, ...invoice }
    }
  } else {
    return { success: false, error: result.error }
  }
}

export const updateProformaInvoice = async (id, updates) => {
  const result = await safeUpdateDocument('proformaInvoices', id, updates)
  if (result.success) {
    return {
      success: true,
      data: { id, ...updates }
    }
  } else {
    return { success: false, error: result.error }
  }
}

export const getSuppliers = async () => {
  const result = await safeGetCollection('suppliers')
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  }
}

export const addSupplier = async (supplier) => {
  const result = await safeAddDocument('suppliers', supplier)
  if (result.success) {
    return {
      success: true,
      data: { id: result.data.id, ...supplier }
    }
  } else {
    return { success: false, error: result.error }
  }
}

export const updateSupplier = async (id, updates) => {
  const result = await safeUpdateDocument('suppliers', id, updates)
  if (result.success) {
    return {
      success: true,
      data: { id, ...updates }
    }
  } else {
    return { success: false, error: result.error }
  }
}
