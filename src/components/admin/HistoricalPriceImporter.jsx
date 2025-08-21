// src/components/admin/HistoricalPriceImporter.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  orderBy,
  limit,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { 
  Upload, 
  History, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  FileText, 
  Calendar, 
  DollarSign, 
  Package, 
  User,
  TrendingUp,
  Award,
  Clock,
  Eye,
  Edit,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';

const HistoricalPriceImporter = () => {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [clientSpecificPricing, setClientSpecificPricing] = useState([]);
  const [importMode, setImportMode] = useState('manual'); // 'manual', 'csv', 'erp'
  const [importing, setImporting] = useState(false);
  const [products, setProducts] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [importStats, setImportStats] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);

  useEffect(() => {
    loadClients();
    loadProducts();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      const clientsQuery = query(
        collection(db, 'clients'), 
        where('isActive', '==', true),
        orderBy('name')
      );
      const clientsSnap = await getDocs(clientsQuery);
      const clientsData = clientsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      alert('Error loading clients. Please try again.');
    } finally {
      setLoading(false);
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

  const loadClientData = async (clientId) => {
    try {
      setLoading(true);
      
      // Load price history
      const historyQuery = query(
        collection(db, 'price_history'),
        where('clientId', '==', clientId),
        where('isActive', '==', true),
        orderBy('soldDate', 'desc')
      );
      const historySnap = await getDocs(historyQuery);
      const historyData = historySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPriceHistory(historyData);

      // Load client-specific pricing
      const pricingQuery = query(
        collection(db, 'client_specific_pricing'),
        where('clientId', '==', clientId),
        where('isActive', '==', true)
      );
      const pricingSnap = await getDocs(pricingQuery);
      const pricingData = pricingSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClientSpecificPricing(pricingData);

      // Load onboarding status
      const onboardingQuery = query(
        collection(db, 'client_onboarding'),
        where('clientId', '==', clientId),
        limit(1)
      );
      const onboardingSnap = await getDocs(onboardingQuery);
      const onboardingData = onboardingSnap.docs.length > 0 
        ? { id: onboardingSnap.docs[0].id, ...onboardingSnap.docs[0].data() }
        : null;
      setOnboardingStatus(onboardingData);

    } catch (error) {
      console.error('Error loading client data:', error);
      alert('Error loading client data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validatePriceRecord = (record, index) => {
    const errors = [];
    
    if (!record.productId || record.productId.trim() === '') {
      errors.push(`Row ${index + 1}: Product ID is required`);
    }
    
    if (!record.price || record.price <= 0) {
      errors.push(`Row ${index + 1}: Valid price is required (must be > 0)`);
    }
    
    if (record.quantity && record.quantity <= 0) {
      errors.push(`Row ${index + 1}: Quantity must be greater than 0`);
    }
    
    if (record.soldDate && isNaN(new Date(record.soldDate).getTime())) {
      errors.push(`Row ${index + 1}: Invalid date format`);
    }
    
    // Check if product exists
    const productExists = products.find(p => p.id === record.productId || p.code === record.productId);
    if (!productExists) {
      errors.push(`Row ${index + 1}: Product '${record.productId}' not found in catalog`);
    }
    
    return errors;
  };

  const importHistoricalPrices = async (clientId, priceData) => {
    setImporting(true);
    setValidationErrors([]);
    
    const batch = writeBatch(db);
    let importedCount = 0;
    let skippedCount = 0;
    let createdPricingCount = 0;
    let updatedPricingCount = 0;
    const allErrors = [];
    
    try {
      // Validate all records first
      for (let i = 0; i < priceData.length; i++) {
        const errors = validatePriceRecord(priceData[i], i);
        allErrors.push(...errors);
      }
      
      if (allErrors.length > 0) {
        setValidationErrors(allErrors);
        throw new Error(`Validation failed: ${allErrors.length} errors found`);
      }

      for (const priceRecord of priceData) {
        try {
          // Find the actual product (by ID or code)
          const product = products.find(p => 
            p.id === priceRecord.productId || p.code === priceRecord.productId
          );
          
          const actualProductId = product?.id || priceRecord.productId;

          // Add to price history
          const historyRef = doc(collection(db, 'price_history'));
          const historyData = {
            ...priceRecord,
            productId: actualProductId,
            clientId,
            createdAt: serverTimestamp(),
            source: importMode,
            isActive: true,
            soldDate: priceRecord.soldDate ? new Date(priceRecord.soldDate) : new Date(),
            // Calculate discount if original price is provided
            ...(priceRecord.originalPrice && priceRecord.originalPrice > priceRecord.price && {
              discount: priceRecord.originalPrice - priceRecord.price,
              discountPercentage: ((priceRecord.originalPrice - priceRecord.price) / priceRecord.originalPrice * 100).toFixed(2)
            })
          };
          
          batch.set(historyRef, historyData);

          // Check if client-specific pricing already exists
          const existingPricingQuery = query(
            collection(db, 'client_specific_pricing'),
            where('clientId', '==', clientId),
            where('productId', '==', actualProductId),
            where('isActive', '==', true)
          );
          const existingPricingSnap = await getDocs(existingPricingQuery);

          if (existingPricingSnap.empty) {
            // Create new client-specific pricing based on historical price
            const pricingRef = doc(collection(db, 'client_specific_pricing'));
            batch.set(pricingRef, {
              clientId,
              productId: actualProductId,
              pricingType: 'fixed',
              fixedPrice: priceRecord.price,
              finalPrice: priceRecord.price,
              basedOnHistoryId: historyRef.id,
              lastSoldPrice: priceRecord.price,
              lastSoldDate: priceRecord.soldDate ? new Date(priceRecord.soldDate) : new Date(),
              priceSource: 'historical',
              autoApproved: true,
              agreementRef: priceRecord.contractRef || 'HISTORICAL',
              validFrom: new Date().toISOString().split('T')[0],
              validUntil: null, // No expiry for historical prices
              minQuantity: priceRecord.quantity || 1,
              notes: `Auto-imported from historical sale${priceRecord.soldDate ? ` on ${new Date(priceRecord.soldDate).toLocaleDateString()}` : ''}`,
              isActive: true,
              priority: 2, // Higher than tier pricing, lower than manual overrides
              createdAt: serverTimestamp(),
              createdBy: 'system_import',
              source: importMode
            });
            createdPricingCount++;
          } else {
            // Update existing pricing if the new price is more recent
            const existingPricing = existingPricingSnap.docs[0];
            const existingData = existingPricing.data();
            const newSoldDate = priceRecord.soldDate ? new Date(priceRecord.soldDate) : new Date();
            const existingSoldDate = existingData.lastSoldDate ? 
              (existingData.lastSoldDate.toDate ? existingData.lastSoldDate.toDate() : new Date(existingData.lastSoldDate)) 
              : new Date(0);

            if (newSoldDate > existingSoldDate) {
              batch.update(existingPricing.ref, {
                lastSoldPrice: priceRecord.price,
                lastSoldDate: newSoldDate,
                finalPrice: priceRecord.price,
                fixedPrice: priceRecord.price,
                basedOnHistoryId: historyRef.id,
                notes: `Updated from historical sale on ${newSoldDate.toLocaleDateString()}`,
                lastModified: serverTimestamp(),
                modifiedBy: 'system_import'
              });
              updatedPricingCount++;
            }
          }

          importedCount++;
        } catch (recordError) {
          console.error('Error processing record:', recordError);
          skippedCount++;
        }
      }

      // Update or create client onboarding status
      if (onboardingStatus) {
        // Update existing onboarding record
        const onboardingRef = doc(db, 'client_onboarding', onboardingStatus.id);
        batch.update(onboardingRef, {
          lastImportDate: serverTimestamp(),
          historicalPricesImported: true,
          pricesImportedCount: (onboardingStatus.pricesImportedCount || 0) + importedCount,
          pricesSkippedCount: (onboardingStatus.pricesSkippedCount || 0) + skippedCount,
          pricingRulesCreated: (onboardingStatus.pricingRulesCreated || 0) + createdPricingCount,
          pricingRulesUpdated: (onboardingStatus.pricingRulesUpdated || 0) + updatedPricingCount,
          lastImportMethod: importMode,
          notes: `Last import: ${importedCount} prices, ${createdPricingCount} new rules, ${updatedPricingCount} updated rules, ${skippedCount} skipped`
        });
      } else {
        // Create new onboarding record
        const onboardingRef = doc(collection(db, 'client_onboarding'));
        batch.set(onboardingRef, {
          clientId,
          onboardingDate: serverTimestamp(),
          historicalPricesImported: true,
          pricesImportedCount: importedCount,
          pricesSkippedCount: skippedCount,
          pricingRulesCreated: createdPricingCount,
          pricingRulesUpdated: updatedPricingCount,
          pricesImportedBy: 'current_user_id', // Replace with actual user ID
          status: 'completed',
          importMethod: importMode,
          notes: `Imported ${importedCount} historical prices, created ${createdPricingCount} pricing rules, updated ${updatedPricingCount} existing rules, skipped ${skippedCount} records`
        });
      }

      await batch.commit();
      
      setImportStats({
        imported: importedCount,
        skipped: skippedCount,
        pricingRulesCreated: createdPricingCount,
        pricingRulesUpdated: updatedPricingCount
      });

      // Reload client data
      await loadClientData(clientId);
      
      // Clear CSV data after successful import
      if (importMode === 'csv') {
        setCsvData([]);
        setCsvFile(null);
      }

    } catch (error) {
      console.error('Error importing historical prices:', error);
      alert(`Error importing prices: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const parseCsvFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        alert('CSV file is empty');
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const record = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim().replace(/"/g, '');
          
          switch (header) {
            case 'product_id':
            case 'productid':
            case 'product id':
            case 'sku':
            case 'code':
              record.productId = value;
              break;
            case 'price':
            case 'last_price':
            case 'sold_price':
            case 'selling_price':
            case 'unit_price':
              record.price = parseFloat(value) || 0;
              break;
            case 'quantity':
            case 'qty':
            case 'sold_qty':
              record.quantity = parseInt(value) || 1;
              break;
            case 'sale_date':
            case 'sold_date':
            case 'date':
            case 'invoice_date':
              record.soldDate = value ? new Date(value) : null;
              break;
            case 'order_id':
            case 'orderid':
            case 'invoice_id':
            case 'invoice_no':
              record.orderId = value;
              break;
            case 'contract_ref':
            case 'contract':
            case 'agreement':
            case 'contract_no':
              record.contractRef = value;
              break;
            case 'original_price':
            case 'list_price':
            case 'catalog_price':
              record.originalPrice = parseFloat(value) || 0;
              break;
            case 'notes':
            case 'remarks':
            case 'description':
              record.notes = value;
              break;
            case 'sales_rep':
            case 'salesperson':
            case 'account_manager':
              record.salesRep = value;
              break;
            case 'payment_terms':
            case 'terms':
              record.paymentTerms = value;
              break;
            case 'delivery_terms':
            case 'incoterms':
              record.deliveryTerms = value;
              break;
            default:
              // Handle any other fields dynamically
              if (value && value !== '') {
                record[header.replace(/ /g, '_')] = value;
              }
              break;
          }
        });
        
        // Only add record if it has essential data
        if (record.productId && record.price > 0) {
          record.priceType = 'sold';
          data.push(record);
        }
      }
      
      setCsvData(data);
      
      if (data.length === 0) {
        alert('No valid price records found in CSV. Please check the format.');
      }
    };
    
    reader.onerror = () => {
      alert('Error reading CSV file. Please try again.');
    };
    
    reader.readAsText(file);
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        alert('Please select a CSV file');
        return;
      }
      setCsvFile(file);
      parseCsvFile(file);
    }
  };

  // Manual Price Entry Component
  const ManualPriceEntry = ({ clientId }) => {
    const [newPriceRecord, setNewPriceRecord] = useState({
      productId: '',
      price: 0,
      quantity: 1,
      soldDate: new Date().toISOString().split('T')[0],
      orderId: '',
      contractRef: '',
      discount: 0,
      originalPrice: 0,
      notes: '',
      salesRep: '',
      paymentTerms: '',
      deliveryTerms: ''
    });

    const addPriceRecord = () => {
      if (!newPriceRecord.productId || !newPriceRecord.price || newPriceRecord.price <= 0) {
        alert('Please fill in product and valid price (must be > 0)');
        return;
      }

      const priceRecord = {
        ...newPriceRecord,
        priceType: 'sold',
        soldDate: new Date(newPriceRecord.soldDate),
        price: parseFloat(newPriceRecord.price),
        quantity: parseInt(newPriceRecord.quantity) || 1,
        originalPrice: parseFloat(newPriceRecord.originalPrice) || 0
      };

      // Calculate discount if original price is provided
      if (priceRecord.originalPrice > 0 && priceRecord.originalPrice > priceRecord.price) {
        priceRecord.discount = priceRecord.originalPrice - priceRecord.price;
        priceRecord.discountPercentage = ((priceRecord.originalPrice - priceRecord.price) / priceRecord.originalPrice * 100).toFixed(2);
      }

      importHistoricalPrices(clientId, [priceRecord]);
      
      // Reset form
      setNewPriceRecord({
        productId: '',
        price: 0,
        quantity: 1,
        soldDate: new Date().toISOString().split('T')[0],
        orderId: '',
        contractRef: '',
        discount: 0,
        originalPrice: 0,
        notes: '',
        salesRep: '',
        paymentTerms: '',
        deliveryTerms: ''
      });
    };

    return (
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-blue-600" />
          Add Historical Price Record
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              value={newPriceRecord.productId}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, productId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.code || product.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Sold Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={newPriceRecord.price}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Sold</label>
            <input
              type="number"
              value={newPriceRecord.quantity}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
            <input
              type="date"
              value={newPriceRecord.soldDate}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, soldDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order/Invoice ID</label>
            <input
              type="text"
              value={newPriceRecord.orderId}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, orderId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="ORDER-2024-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Reference</label>
            <input
              type="text"
              value={newPriceRecord.contractRef}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, contractRef: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="CONTRACT-2024-ABC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Original List Price (Optional)</label>
            <input
              type="number"
              value={newPriceRecord.originalPrice}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sales Representative</label>
            <input
              type="text"
              value={newPriceRecord.salesRep}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, salesRep: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="John Smith"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={newPriceRecord.notes}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows="2"
              placeholder="Volume discount, special terms, etc."
            />
          </div>
        </div>

        {/* Discount calculation display */}
        {newPriceRecord.originalPrice > 0 && newPriceRecord.price > 0 && newPriceRecord.originalPrice > newPriceRecord.price && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 text-green-700">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">
                Discount: ${(newPriceRecord.originalPrice - newPriceRecord.price).toFixed(2)} 
                ({(((newPriceRecord.originalPrice - newPriceRecord.price) / newPriceRecord.originalPrice) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        <button
          onClick={addPriceRecord}
          disabled={importing || !newPriceRecord.productId || !newPriceRecord.price}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {importing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Adding...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Add Historical Price Record
            </>
          )}
        </button>
      </div>
    );
  };

  // CSV Import Component
  const CsvImportSection = ({ clientId }) => {
    const handleImportCsv = () => {
      if (csvData.length === 0) {
        alert('Please upload a valid CSV file first');
        return;
      }

      importHistoricalPrices(clientId, csvData);
    };

    const downloadTemplate = () => {
      const template = `product_id,price,quantity,sale_date,order_id,contract_ref,original_price,notes,sales_rep,payment_terms,delivery_terms
PROD001,150.00,5,2024-01-15,ORDER-2024-001,CONTRACT-ABC,175.00,Volume discount,John Smith,Net 30,FOB Factory
PROD002,89.99,10,2024-01-20,ORDER-2024-002,,95.00,Regular sale,Jane Doe,,`;
      
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'historical_prices_template.csv';
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-600" />
            CSV Import
          </h3>
          <button
            onClick={downloadTemplate}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Download className="h-4 w-4" />
            Download Template
          </button>
        </div>
        
        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Upload CSV file with historical pricing data</p>
          <p className="text-sm text-gray-500 mb-4">
            Expected columns: product_id, price, quantity, sale_date, order_id, contract_ref, original_price, notes
          </p>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleCsvUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h4 className="font-medium">Validation Errors ({validationErrors.length})</h4>
            </div>
            <div className="text-sm text-red-600 max-h-32 overflow-y-auto">
              {validationErrors.map((error, index) => (
                <div key={index} className="mb-1">• {error}</div>
              ))}
            </div>
          </div>
        )}

        {/* CSV Preview */}
        {csvData.length > 0 && (
          <div className="mb-4">
            <h4 className="text-md font-medium mb-2 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview ({csvData.length} records)
            </h4>
            <div className="overflow-x-auto max-h-64 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Product ID</th>
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">Quantity</th>
                    <th className="px-4 py-2 text-left">Sale Date</th>
                    <th className="px-4 py-2 text-left">Order ID</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {csvData.slice(0, 10).map((record, index) => {
                    const product = products.find(p => p.id === record.productId || p.code === record.productId);
                    const isValid = record.productId && record.price > 0 && product;
                    
                    return (
                      <tr key={index} className={`hover:bg-gray-50 ${!isValid ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            {record.productId}
                            {!product && <AlertTriangle className="h-3 w-3 text-red-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            ${record.price?.toFixed(2)}
                            {(!record.price || record.price <= 0) && <AlertTriangle className="h-3 w-3 text-red-500" />}
                          </div>
                        </td>
                        <td className="px-4 py-2">{record.quantity || 1}</td>
                        <td className="px-4 py-2">
                          {record.soldDate ? new Date(record.soldDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-2">{record.orderId || '-'}</td>
                        <td className="px-4 py-2">
                          {isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              Invalid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {csvData.length > 10 && (
              <p className="text-sm text-gray-500 mt-2">Showing first 10 records of {csvData.length} total</p>
            )}
          </div>
        )}

        {/* Import Button */}
        {csvData.length > 0 && (
          <button
            onClick={handleImportCsv}
            disabled={importing || validationErrors.length > 0}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Importing {csvData.length} records...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Import {csvData.length} Historical Price Records
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  // Price History Table Component
  const PriceHistoryTable = ({ history }) => {
    return (
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Price History ({history.length} records)
          </h3>
        </div>
        
        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>No price history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Product</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Last Sold Price</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Quantity</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Sale Date</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Order ID</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Source</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((record) => {
                  const product = products.find(p => p.id === record.productId);
                  const soldDate = record.soldDate?.toDate ? record.soldDate.toDate() : new Date(record.soldDate);
                  
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{product?.name || `Product ${record.productId}`}</div>
                            <div className="text-gray-500 text-xs">{record.productId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">${record.price.toFixed(2)}</span>
                          {record.originalPrice && record.originalPrice > record.price && (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500 line-through">
                                ${record.originalPrice.toFixed(2)}
                              </span>
                              <span className="text-xs text-green-600 font-medium">
                                (-{record.discountPercentage}%)
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{record.quantity}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {soldDate ? soldDate.toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {record.orderId ? (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            {record.orderId}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          record.source === 'manual' ? 'bg-blue-100 text-blue-700' :
                          record.source === 'csv' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {record.source === 'manual' && <Edit className="h-3 w-3" />}
                          {record.source === 'csv' && <Upload className="h-3 w-3" />}
                          {record.source === 'erp' && <RefreshCw className="h-3 w-3" />}
                          {record.source || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Applied
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Client Specific Pricing Table Component
  const ClientSpecificPricingTable = ({ pricing }) => {
    return (
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-600" />
            Client-Specific Pricing ({pricing.length} products)
          </h3>
        </div>
        
        {pricing.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p>No client-specific pricing configured</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Product</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Special Price</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Source</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Last Sold</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Valid Period</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pricing.map((record) => {
                  const product = products.find(p => p.id === record.productId);
                  const lastSoldDate = record.lastSoldDate?.toDate ? record.lastSoldDate.toDate() : 
                                      record.lastSoldDate ? new Date(record.lastSoldDate) : null;
                  const validUntil = record.validUntil ? new Date(record.validUntil) : null;
                  const isExpired = validUntil && validUntil < new Date();
                  
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{product?.name || `Product ${record.productId}`}</div>
                            <div className="text-gray-500 text-xs">{record.productId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">${record.finalPrice.toFixed(2)}</span>
                          {record.pricingType === 'fixed' && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Fixed</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          record.priceSource === 'historical' ? 'bg-green-100 text-green-700' :
                          record.priceSource === 'negotiated' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {record.priceSource === 'historical' && <History className="h-3 w-3" />}
                          {record.priceSource === 'negotiated' && <User className="h-3 w-3" />}
                          {record.priceSource || 'manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {lastSoldDate ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div>
                              <div>{lastSoldDate.toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500">${record.lastSoldPrice?.toFixed(2)}</div>
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs">
                          <div>From: {new Date(record.validFrom).toLocaleDateString()}</div>
                          {validUntil ? (
                            <div className={isExpired ? 'text-red-600' : 'text-gray-600'}>
                              Until: {validUntil.toLocaleDateString()}
                            </div>
                          ) : (
                            <div className="text-green-600">No expiry</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          isExpired ? 'bg-red-100 text-red-700' :
                          record.isActive ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {isExpired ? (
                            <>
                              <Clock className="h-3 w-3" />
                              Expired
                            </>
                          ) : record.isActive ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Import Success Stats Component
  const ImportSuccessStats = ({ stats }) => {
    if (!stats) return null;

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-green-700 mb-3">
          <CheckCircle className="h-5 w-5" />
          <h3 className="font-medium">Import Completed Successfully!</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.imported}</div>
            <div className="text-green-700">Records Imported</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.pricingRulesCreated}</div>
            <div className="text-blue-700">New Pricing Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.pricingRulesUpdated}</div>
            <div className="text-purple-700">Updated Rules</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.skipped}</div>
            <div className="text-gray-700">Records Skipped</div>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-green-700">
          Client can now log in and see their historical pricing automatically applied to the catalog.
        </div>
      </div>
    );
  };

  // Onboarding Status Component
  const OnboardingStatusCard = ({ status }) => {
    if (!status) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-blue-700 mb-3">
          <Info className="h-5 w-5" />
          <h3 className="font-medium">Onboarding Status</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Status</div>
            <div className="font-medium capitalize">{status.status}</div>
          </div>
          <div>
            <div className="text-gray-600">Prices Imported</div>
            <div className="font-medium">{status.pricesImportedCount || 0}</div>
          </div>
          <div>
            <div className="text-gray-600">Last Import</div>
            <div className="font-medium">
              {status.lastImportDate?.toDate ? 
                status.lastImportDate.toDate().toLocaleDateString() : 
                status.onboardingDate?.toDate ? 
                status.onboardingDate.toDate().toLocaleDateString() : 
                'Not available'
              }
            </div>
          </div>
        </div>
        
        {status.notes && (
          <div className="mt-3 text-sm text-blue-700 bg-blue-100 rounded p-2">
            {status.notes}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Historical Price Management</h1>
        <p className="text-gray-600">Import and manage client price history for seamless onboarding</p>
      </div>

      {/* Client Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Client</label>
        <select
          value={selectedClient?.id || ''}
          onChange={(e) => {
            const client = clients.find(c => c.id === e.target.value);
            setSelectedClient(client);
            setImportStats(null); // Reset stats when changing client
            setValidationErrors([]); // Reset validation errors
            setCsvData([]); // Reset CSV data
            setCsvFile(null); // Reset CSV file
            if (client) {
              loadClientData(client.id);
            } else {
              setPriceHistory([]);
              setClientSpecificPricing([]);
              setOnboardingStatus(null);
            }
          }}
          disabled={loading}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Choose a client...</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.email})
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )}

      {selectedClient && !loading && (
        <div className="space-y-6">
          {/* Client Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">{selectedClient.name}</h3>
                <p className="text-sm text-blue-700">
                  Default Tier: {selectedClient.defaultTierId} | 
                  Account Manager: {selectedClient.accountManager || 'Not assigned'}
                </p>
              </div>
            </div>
          </div>

          {/* Onboarding Status */}
          <OnboardingStatusCard status={onboardingStatus} />

          {/* Import Success Stats */}
          <ImportSuccessStats stats={importStats} />

          {/* Import Mode Selector */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Import Method</h3>
            <div className="flex gap-4">
              <button
                onClick={() => setImportMode('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  importMode === 'manual'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                }`}
              >
                <History className="h-4 w-4" />
                Manual Entry
              </button>
              <button
                onClick={() => setImportMode('csv')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  importMode === 'csv'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                }`}
              >
                <Upload className="h-4 w-4" />
                CSV Import
              </button>
              <button
                onClick={() => setImportMode('erp')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  importMode === 'erp'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
                }`}
              >
                <Download className="h-4 w-4" />
                ERP Integration
              </button>
            </div>
          </div>

          {/* Import Interface */}
          {importMode === 'manual' && (
            <ManualPriceEntry clientId={selectedClient.id} />
          )}

          {importMode === 'csv' && (
            <CsvImportSection clientId={selectedClient.id} />
          )}

          {importMode === 'erp' && (
            <div className="bg-white border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Download className="h-5 w-5 text-purple-600" />
                ERP Integration
              </h3>
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">ERP Integration Coming Soon</p>
                <p className="text-sm text-gray-500 mb-4">
                  Direct integration with SAP, Oracle, and other ERP systems for automated price history import
                </p>
                <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
                  Request ERP Integration
                </button>
              </div>
            </div>
          )}

          {/* Data Display Tabs */}
          {(priceHistory.length > 0 || clientSpecificPricing.length > 0) && (
            <div className="space-y-6">
              {/* Client Specific Pricing */}
              {clientSpecificPricing.length > 0 && (
                <ClientSpecificPricingTable pricing={clientSpecificPricing} />
              )}

              {/* Price History */}
              {priceHistory.length > 0 && (
                <PriceHistoryTable history={priceHistory} />
              )}
            </div>
          )}

          {/* Empty State */}
          {priceHistory.length === 0 && clientSpecificPricing.length === 0 && selectedClient && !importing && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Price History Found</h3>
              <p className="text-gray-600 mb-4">
                Start by importing historical pricing data for {selectedClient.name}
              </p>
              <p className="text-sm text-gray-500">
                Once imported, historical prices will automatically be applied to their product catalog
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoricalPriceImporter;
