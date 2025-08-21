// src/components/admin/HistoricalPriceImporter.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, doc, addDoc, updateDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { Upload, History, CheckCircle, AlertCircle, Download, FileText, Calendar, DollarSign, Package, User } from 'lucide-react';

const HistoricalPriceImporter = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [importMode, setImportMode] = useState('manual'); // 'manual', 'csv', 'erp'
  const [importing, setImporting] = useState(false);
  const [products, setProducts] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [importStats, setImportStats] = useState(null);

  useEffect(() => {
    loadClients();
    loadProducts();
  }, []);

  const loadClients = async () => {
    try {
      const clientsQuery = query(collection(db, 'clients'), where('isActive', '==', true));
      const clientsSnap = await getDocs(clientsQuery);
      const clientsData = clientsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const productsQuery = query(collection(db, 'products'));
      const productsSnap = await getDocs(productsQuery);
      const productsData = productsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadClientPriceHistory = async (clientId) => {
    try {
      const historyQuery = query(
        collection(db, 'price_history'),
        where('clientId', '==', clientId),
        where('isActive', '==', true)
      );
      const historySnap = await getDocs(historyQuery);
      const historyData = historySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPriceHistory(historyData);
    } catch (error) {
      console.error('Error loading price history:', error);
    }
  };

  const importHistoricalPrices = async (clientId, priceData) => {
    setImporting(true);
    const batch = writeBatch(db);
    let importedCount = 0;
    let skippedCount = 0;
    let createdPricingCount = 0;
    
    try {
      for (const priceRecord of priceData) {
        // Validate required fields
        if (!priceRecord.productId || !priceRecord.price || priceRecord.price <= 0) {
          skippedCount++;
          continue;
        }

        // Add to price history
        const historyRef = doc(collection(db, 'price_history'));
        batch.set(historyRef, {
          ...priceRecord,
          clientId,
          createdAt: new Date(),
          source: importMode,
          isActive: true
        });

        // Check if client-specific pricing already exists
        const existingPricingQuery = query(
          collection(db, 'client_specific_pricing'),
          where('clientId', '==', clientId),
          where('productId', '==', priceRecord.productId),
          where('isActive', '==', true)
        );
        const existingPricingSnap = await getDocs(existingPricingQuery);

        if (existingPricingSnap.empty) {
          // Create new pricing based on historical price
          const pricingRef = doc(collection(db, 'client_specific_pricing'));
          batch.set(pricingRef, {
            clientId,
            productId: priceRecord.productId,
            pricingType: 'fixed',
            fixedPrice: priceRecord.price,
            finalPrice: priceRecord.price,
            basedOnHistoryId: historyRef.id,
            lastSoldPrice: priceRecord.price,
            lastSoldDate: priceRecord.soldDate || new Date(),
            priceSource: 'historical',
            autoApproved: true,
            agreementRef: priceRecord.contractRef || 'HISTORICAL',
            validFrom: new Date().toISOString().split('T')[0],
            notes: `Auto-imported from historical sale${priceRecord.soldDate ? ` on ${new Date(priceRecord.soldDate).toLocaleDateString()}` : ''}`,
            isActive: true,
            priority: 2, // Higher than tier pricing, lower than manual overrides
            createdAt: new Date(),
            createdBy: 'system_import'
          });
          createdPricingCount++;
        }

        importedCount++;
      }

      // Update client onboarding status
      const onboardingRef = doc(collection(db, 'client_onboarding'));
      batch.set(onboardingRef, {
        clientId,
        onboardingDate: new Date(),
        historicalPricesImported: true,
        pricesImportedCount: importedCount,
        pricesSkippedCount: skippedCount,
        pricingRulesCreated: createdPricingCount,
        pricesImportedBy: 'current_user_id', // Replace with actual user ID
        status: 'completed',
        importMethod: importMode,
        notes: `Imported ${importedCount} historical prices, created ${createdPricingCount} pricing rules, skipped ${skippedCount} invalid records`
      });

      await batch.commit();
      
      setImportStats({
        imported: importedCount,
        skipped: skippedCount,
        pricingRulesCreated: createdPricingCount
      });

      loadClientPriceHistory(clientId);
    } catch (error) {
      console.error('Error importing historical prices:', error);
      alert('Error importing prices. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const parseCsvFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(',');
        const record = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim().replace(/"/g, '');
          
          switch (header) {
            case 'product_id':
            case 'productid':
            case 'product id':
              record.productId = value;
              break;
            case 'price':
            case 'last_price':
            case 'sold_price':
              record.price = parseFloat(value) || 0;
              break;
            case 'quantity':
            case 'qty':
              record.quantity = parseInt(value) || 1;
              break;
            case 'sale_date':
            case 'sold_date':
            case 'date':
              record.soldDate = new Date(value);
              break;
            case 'order_id':
            case 'orderid':
            case 'invoice_id':
              record.orderId = value;
              break;
            case 'contract_ref':
            case 'contract':
            case 'agreement':
              record.contractRef = value;
              break;
            case 'original_price':
            case 'list_price':
              record.originalPrice = parseFloat(value) || 0;
              break;
            case 'notes':
            case 'remarks':
              record.notes = value;
              break;
            default:
              // Handle any other fields
