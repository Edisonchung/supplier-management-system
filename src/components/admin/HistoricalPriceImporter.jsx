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
              break;
          }
        });
        
        // Calculate discount if original price is available
        if (record.originalPrice && record.price) {
          record.discount = record.originalPrice - record.price;
          record.discountPercentage = ((record.originalPrice - record.price) / record.originalPrice * 100).toFixed(2);
        }
        
        record.priceType = 'sold';
        data.push(record);
      }
      
      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
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
      notes: ''
    });

    const addPriceRecord = () => {
      if (!newPriceRecord.productId || !newPriceRecord.price) {
        alert('Please fill in product and price');
        return;
      }

      const priceRecord = {
        ...newPriceRecord,
        priceType: 'sold',
        soldDate: new Date(newPriceRecord.soldDate),
        discountPercentage: newPriceRecord.originalPrice > 0 
          ? ((newPriceRecord.originalPrice - newPriceRecord.price) / newPriceRecord.originalPrice * 100)
          : 0
      };

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
        notes: ''
      });
    };

    return (
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-blue-600" />
          Add Historical Price Record
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
            <select
              value={newPriceRecord.productId}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, productId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Sold Price</label>
            <input
              type="number"
              value={newPriceRecord.price}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Sold</label>
            <input
              type="number"
              value={newPriceRecord.quantity}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label>
            <input
              type="date"
              value={newPriceRecord.soldDate}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, soldDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order/Invoice ID</label>
            <input
              type="text"
              value={newPriceRecord.orderId}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, orderId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="ORDER-2024-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract Reference</label>
            <input
              type="text"
              value={newPriceRecord.contractRef}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, contractRef: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="CONTRACT-2024-ABC"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Original List Price (Optional)</label>
            <input
              type="number"
              value={newPriceRecord.originalPrice}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, originalPrice: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              type="text"
              value={newPriceRecord.notes}
              onChange={(e) => setNewPriceRecord(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Volume discount, special terms, etc."
            />
          </div>
        </div>

        <button
          onClick={addPriceRecord}
          disabled={importing}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

    return (
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5 text-green-600" />
          CSV Import
        </h3>
        
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

        {/* CSV Preview */}
        {csvData.length > 0 && (
          <div className="mb-4">
            <h4 className="text-md font-medium mb-2">Preview ({csvData.length} records)</h4>
            <div className="overflow-x-auto max-h-64 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">Product ID</th>
                    <th className="px-4 py-2 text-left">Price</th>
                    <th className="px-4 py-2 text-left">Quantity</th>
                    <th className="px-4 py-2 text-left">Sale Date</th>
                    <th className="px-4 py-2 text-left">Order ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {csvData.slice(0, 10).map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2">{record.productId}</td>
                      <td className="px-4 py-2">${record.price?.toFixed(2)}</td>
                      <td className="px-4 py-2">{record.quantity}</td>
                      <td className="px-4 py-2">{record.soldDate ? new Date(record.soldDate).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2">{record.orderId || '-'}</td>
                    </tr>
                  ))}
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
            disabled={importing}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Product</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Last Sold Price</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Quantity</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Sale Date</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Order ID</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {history.map((record, index) => {
                const product = products.find(p => p.id === record.productId);
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
                          <span className="text-xs text-gray-500 line-through">
                            ${record.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{record.quantity}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {record.soldDate ? new Date(record.soldDate.seconds ? record.soldDate.seconds * 1000 : record.soldDate).toLocaleDateString() : '-'}
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
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        Applied
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          // View details or edit functionality
                          console.log('View details for:', record);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.imported}</div>
            <div className="text-green-700">Records Imported</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.pricingRulesCreated}</div>
            <div className="text-blue-700">Pricing Rules Created</div>
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
            if (client) {
              loadClientPriceHistory(client.id);
            }
          }}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Choose a client...</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.email})
            </option>
          ))}
        </select>
      </div>

      {selectedClient && (
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
                <p className="text-sm text-gray-500">
                  Direct integration with SAP, Oracle, and other ERP systems for automated price history import
                </p>
                <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                  Request ERP Integration
                </button>
              </div>
            </div>
          )}

          {/* Price History Display */}
          {priceHistory.length > 0 && (
            <PriceHistoryTable history={priceHistory} />
          )}

          {/* Empty State */}
          {priceHistory.length === 0 && selectedClient && (
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
