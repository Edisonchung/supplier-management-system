// src/components/admin/EnhancedPricingManager.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, doc, updateDoc, addDoc, query, where, getDocs, orderBy, writeBatch } from 'firebase/firestore';
import { User, Building, Crown, AlertTriangle, Check, X, DollarSign, Percent, History, Upload, Download, Filter } from 'lucide-react';

const EnhancedPricingManager = () => {
  const [viewMode, setViewMode] = useState('tier'); // 'tier' or 'client'
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSpecificPricing, setClientSpecificPricing] = useState({});
  const [products, setProducts] = useState([]);
  const [tierPricing, setTierPricing] = useState({});
  const [selectedTier, setSelectedTier] = useState('tier_0');
  const [bulkUpdateMode, setBulkUpdateMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const tiers = [
    { id: 'tier_0', name: 'Public', color: 'bg-gray-100', icon: User },
    { id: 'tier_1', name: 'End User', color: 'bg-blue-100', icon: DollarSign },
    { id: 'tier_2', name: 'System Integrator', color: 'bg-green-100', icon: Building },
    { id: 'tier_3', name: 'Trader', color: 'bg-purple-100', icon: Crown }
  ];

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadClients(),
        loadProducts(),
        loadTierPricing(),
        loadClientSpecificPricing()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const loadTierPricing = async () => {
    try {
      const pricingQuery = query(collection(db, 'product_pricing'));
      const pricingSnap = await getDocs(pricingQuery);
      const pricingMap = {};
      
      pricingSnap.docs.forEach(doc => {
        const data = doc.data();
        const key = `${data.productId}_${data.tierId}`;
        pricingMap[key] = { id: doc.id, ...data };
      });
      
      setTierPricing(pricingMap);
    } catch (error) {
      console.error('Error loading tier pricing:', error);
    }
  };

  const loadClientSpecificPricing = async () => {
    try {
      const pricingQuery = query(
        collection(db, 'client_specific_pricing'),
        where('isActive', '==', true),
        orderBy('priority', 'desc')
      );
      const pricingSnap = await getDocs(pricingQuery);
      const pricingMap = {};
      
      pricingSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!pricingMap[data.clientId]) {
          pricingMap[data.clientId] = {};
        }
        pricingMap[data.clientId][data.productId] = { id: doc.id, ...data };
      });
      
      setClientSpecificPricing(pricingMap);
    } catch (error) {
      console.error('Error loading client-specific pricing:', error);
    }
  };

  const updateTierPricing = async (productId, tierId, pricingUpdate) => {
    try {
      const key = `${productId}_${tierId}`;
      const existingPricing = tierPricing[key];

      if (existingPricing) {
        await updateDoc(doc(db, 'product_pricing', existingPricing.id), {
          ...pricingUpdate,
          lastModified: new Date(),
          modifiedBy: 'current_user_id'
        });
      } else {
        await addDoc(collection(db, 'product_pricing'), {
          productId,
          tierId,
          ...pricingUpdate,
          createdAt: new Date(),
          lastModified: new Date(),
          modifiedBy: 'current_user_id',
          isActive: true
        });
      }

      await loadTierPricing();
    } catch (error) {
      console.error('Error updating tier pricing:', error);
    }
  };

  const saveClientSpecificPricing = async (clientId, productId, pricingData) => {
    try {
      const existingPricing = clientSpecificPricing[clientId]?.[productId];
      
      if (existingPricing) {
        await updateDoc(doc(db, 'client_specific_pricing', existingPricing.id), {
          ...pricingData,
          lastModified: new Date(),
          modifiedBy: 'current_user_id'
        });
      } else {
        await addDoc(collection(db, 'client_specific_pricing'), {
          clientId,
          productId,
          ...pricingData,
          isActive: true,
          priority: 1,
          createdAt: new Date(),
          createdBy: 'current_user_id'
        });
      }

      await loadClientSpecificPricing();
    } catch (error) {
      console.error('Error saving client pricing:', error);
    }
  };

  const calculateFinalPrice = (basePrice, discountType, discountValue) => {
    if (discountType === 'percentage') {
      return basePrice * (1 - discountValue / 100);
    } else {
      return basePrice - discountValue;
    }
  };

  const applyBulkUpdate = async (discountValue, discountType, category) => {
    const batch = writeBatch(db);
    let updatedCount = 0;

    try {
      for (const product of products) {
        if (category && product.category !== category) continue;
        if (selectedProducts.length > 0 && !selectedProducts.includes(product.id)) continue;

        const basePrice = product.price || 0;
        const finalPrice = calculateFinalPrice(basePrice, discountType, discountValue);

        const key = `${product.id}_${selectedTier}`;
        const existingPricing = tierPricing[key];

        if (existingPricing) {
          const docRef = doc(db, 'product_pricing', existingPricing.id);
          batch.update(docRef, {
            basePrice,
            discountType,
            discountValue,
            finalPrice,
            lastModified: new Date(),
            modifiedBy: 'current_user_id'
          });
        } else {
          const docRef = doc(collection(db, 'product_pricing'));
          batch.set(docRef, {
            productId: product.id,
            tierId: selectedTier,
            basePrice,
            discountType,
            discountValue,
            finalPrice,
            isActive: true,
            createdAt: new Date(),
            modifiedBy: 'current_user_id'
          });
        }
        updatedCount++;
      }

      await batch.commit();
      alert(`Successfully updated ${updatedCount} products!`);
      await loadTierPricing();
    } catch (error) {
      console.error('Error applying bulk update:', error);
      alert('Error applying bulk update. Please try again.');
    }
  };

  // Tier-based Pricing Card Component
  const TierPricingCard = ({ product, tier }) => {
    const key = `${product.id}_${tier.id}`;
    const pricing = tierPricing[key];
    const [localPricing, setLocalPricing] = useState({
      basePrice: product.price || 0,
      discountType: 'percentage',
      discountValue: 0,
      ...pricing
    });

    const finalPrice = calculateFinalPrice(
      localPricing.basePrice,
      localPricing.discountType,
      localPricing.discountValue
    );

    const handleSave = () => {
      updateTierPricing(product.id, tier.id, {
        ...localPricing,
        finalPrice
      });
    };

    return (
      <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
            <p className="text-xs text-gray-500">{product.code || product.id}</p>
          </div>
          <span className={`px-2 py-1 rounded text-xs font-medium ${tier.color} text-gray-700`}>
            {tier.name}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
            <input
              type="number"
              value={localPricing.basePrice}
              onChange={(e) => setLocalPricing(prev => ({
                ...prev,
                basePrice: parseFloat(e.target.value) || 0
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
            <select
              value={localPricing.discountType}
              onChange={(e) => setLocalPricing(prev => ({
                ...prev,
                discountType: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount ($)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {localPricing.discountType === 'percentage' ? 'Discount %' : 'Discount Amount'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={localPricing.discountValue}
                onChange={(e) => setLocalPricing(prev => ({
                  ...prev,
                  discountValue: parseFloat(e.target.value) || 0
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm pr-8"
                step="0.01"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                {localPricing.discountType === 'percentage' ? (
                  <Percent className="h-4 w-4 text-gray-400" />
                ) : (
                  <DollarSign className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Final Price:</span>
              <span className="text-lg font-bold text-green-600">
                ${finalPrice.toFixed(2)}
              </span>
            </div>
            {localPricing.discountValue > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {localPricing.discountType === 'percentage' 
                  ? `${localPricing.discountValue}% discount`
                  : `$${localPricing.discountValue} discount`
                }
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Save Pricing
          </button>
        </div>
      </div>
    );
  };

  // Client-Specific Pricing Card Component
  const ClientSpecificPricingCard = ({ client, product }) => {
    const existingPricing = clientSpecificPricing[client.id]?.[product.id];
    const [pricingForm, setPricingForm] = useState({
      pricingType: 'fixed',
      fixedPrice: product.price || 0,
      basePrice: product.price || 0,
      markupType: 'percentage',
      markupValue: 0,
      agreementRef: '',
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: '',
      minQuantity: 1,
      notes: '',
      ...existingPricing
    });

    const calculateFinalPrice = () => {
      if (pricingForm.pricingType === 'fixed') {
        return pricingForm.fixedPrice;
      } else {
        const base = pricingForm.basePrice;
        if (pricingForm.markupType === 'percentage') {
          return base * (1 + pricingForm.markupValue / 100);
        } else {
          return base + pricingForm.markupValue;
        }
      }
    };

    const finalPrice = calculateFinalPrice();
    const hasExistingPricing = !!existingPricing;

    return (
      <div className={`bg-white border-2 rounded-lg p-5 transition-all ${
        hasExistingPricing ? 'border-green-200 bg-green-50' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-500">Code: {product.code || product.id}</p>
          </div>
          {hasExistingPricing && (
            <div className="flex items-center gap-2 text-green-600">
              <Crown className="h-4 w-4" />
              <span className="text-xs font-medium">Special Price</span>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPricingForm(prev => ({ ...prev, pricingType: 'fixed' }))}
              className={`p-2 rounded-md text-sm font-medium transition-colors ${
                pricingForm.pricingType === 'fixed'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
              }`}
            >
              Fixed Price
            </button>
            <button
              onClick={() => setPricingForm(prev => ({ ...prev, pricingType: 'markup' }))}
              className={`p-2 rounded-md text-sm font-medium transition-colors ${
                pricingForm.pricingType === 'markup'
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-200'
              }`}
            >
              Markup/Discount
            </button>
          </div>
        </div>

        {pricingForm.pricingType === 'fixed' ? (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fixed Price for {client.name}
            </label>
            <input
              type="number"
              value={pricingForm.fixedPrice}
              onChange={(e) => setPricingForm(prev => ({
                ...prev,
                fixedPrice: parseFloat(e.target.value) || 0
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              step="0.01"
              placeholder="Enter exact price"
            />
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price</label>
              <input
                type="number"
                value={pricingForm.basePrice}
                onChange={(e) => setPricingForm(prev => ({
                  ...prev,
                  basePrice: parseFloat(e.target.value) || 0
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                step="0.01"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={pricingForm.markupType}
                  onChange={(e) => setPricingForm(prev => ({
                    ...prev,
                    markupType: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input
                  type="number"
                  value={pricingForm.markupValue}
                  onChange={(e) => setPricingForm(prev => ({
                    ...prev,
                    markupValue: parseFloat(e.target.value) || 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  step="0.01"
                  placeholder={pricingForm.markupType === 'percentage' ? '% (neg for discount)' : '$ (neg for discount)'}
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Agreement Ref</label>
            <input
              type="text"
              value={pricingForm.agreementRef}
              onChange={(e) => setPricingForm(prev => ({
                ...prev,
                agreementRef: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Contract/PO number"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Quantity</label>
            <input
              type="number"
              value={pricingForm.minQuantity}
              onChange={(e) => setPricingForm(prev => ({
                ...prev,
                minQuantity: parseInt(e.target.value) || 1
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
            <input
              type="date"
              value={pricingForm.validFrom}
              onChange={(e) => setPricingForm(prev => ({
                ...prev,
                validFrom: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until (Optional)</label>
            <input
              type="date"
              value={pricingForm.validUntil}
              onChange={(e) => setPricingForm(prev => ({
                ...prev,
                validUntil: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={pricingForm.notes}
            onChange={(e) => setPricingForm(prev => ({
              ...prev,
              notes: e.target.value
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            rows="2"
            placeholder="Special terms, volume discounts, etc."
          />
        </div>

        <div className={`p-3 rounded-md mb-4 ${
          finalPrice < (product.price || 0) ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">
              Final Price for {client.name}:
            </span>
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                ${finalPrice.toFixed(2)}
              </div>
              {finalPrice !== (product.price || 0) && (
                <div className={`text-xs ${
                  finalPrice < (product.price || 0) ? 'text-green-600' : 'text-red-600'
                }`}>
                  {finalPrice < (product.price || 0) ? 'Discount' : 'Markup'}: 
                  ${Math.abs(finalPrice - (product.price || 0)).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => saveClientSpecificPricing(client.id, product.id, {
              ...pricingForm,
              finalPrice
            })}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" />
            Save Special Price
          </button>
          
          {hasExistingPricing && (
            <button
              onClick={() => {
                saveClientSpecificPricing(client.id, product.id, {
                  ...existingPricing,
                  isActive: false
                });
              }}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors text-sm"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Enhanced Pricing Management</h1>
        <p className="text-gray-600">Manage tier-based and client-specific pricing with historical context</p>
      </div>

      {/* View Mode Toggle */}
      <div className="mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('tier')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              viewMode === 'tier'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <User className="h-4 w-4" />
            Tier-Based Pricing
          </button>
          <button
            onClick={() => setViewMode('client')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              viewMode === 'client'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Building className="h-4 w-4" />
            Client-Specific Pricing
          </button>
        </div>
      </div>

      {/* Tier-Based Pricing View */}
      {viewMode === 'tier' && (
        <div>
          {/* Tier Selector */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {tiers.map(tier => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    selectedTier === tier.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tier.icon className="h-4 w-4" />
                  {tier.name}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk Operations */}
          <div className="mb-6 bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Bulk Operations</h2>
              <button
                onClick={() => setBulkUpdateMode(!bulkUpdateMode)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  bulkUpdateMode
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {bulkUpdateMode ? 'Exit Bulk Mode' : 'Enter Bulk Mode'}
              </button>
            </div>

            {bulkUpdateMode && (
              <BulkUpdateForm 
                onApply={applyBulkUpdate}
                products={products}
                selectedTier={selectedTier}
              />
            )}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(product => {
              const selectedTierObj = tiers.find(t => t.id === selectedTier);
              return (
                <TierPricingCard
                  key={`${product.id}_${selectedTier}`}
                  product={product}
                  tier={selectedTierObj}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Client-Specific Pricing View */}
      {viewMode === 'client' && (
        <div>
          {/* Client Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Client
            </label>
            <select
              value={selectedClient?.id || ''}
              onChange={(e) => {
                const client = clients.find(c => c.id === e.target.value);
                setSelectedClient(client);
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

          {/* Client-Specific Pricing Grid */}
          {selectedClient && (
            <div>
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-1">
                  Special Pricing for {selectedClient.name}
                </h3>
                <p className="text-sm text-blue-700">
                  Default Tier: {selectedClient.defaultTierId} | 
                  Account Manager: {selectedClient.accountManager || 'Not assigned'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                  <ClientSpecificPricingCard
                    key={`${selectedClient.id}_${product.id}`}
                    client={selectedClient}
                    product={product}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Bulk Update Form Component
const BulkUpdateForm = ({ onApply, products, selectedTier }) => {
  const [bulkForm, setBulkForm] = useState({
    discountValue: 0,
    discountType: 'percentage',
    category: '',
    selectedProductIds: []
  });

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const handleApply = () => {
    if (bulkForm.discountValue === 0) {
      alert('Please enter a discount value');
      return;
    }

    onApply(bulkForm.discountValue, bulkForm.discountType, bulkForm.category);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
        <input
          type="number"
          value={bulkForm.discountValue}
          onChange={(e) => setBulkForm(prev => ({
            ...prev,
            discountValue: parseFloat(e.target.value) || 0
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Enter value"
          step="0.01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
        <select
          value={bulkForm.discountType}
          onChange={(e) => setBulkForm(prev => ({
            ...prev,
            discountType: e.target.value
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed Amount</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category (Optional)</label>
        <select
          value={bulkForm.category}
          onChange={(e) => setBulkForm(prev => ({
            ...prev,
            category: e.target.value
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      <button
        onClick={handleApply}
        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center justify-center gap-2"
      >
        <Check className="h-4 w-4" />
        Apply to {selectedTier}
      </button>

      <button
        onClick={() => setBulkForm({ discountValue: 0, discountType: 'percentage', category: '', selectedProductIds: [] })}
        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
      >
        Reset
      </button>
    </div>
  );
};

export default EnhancedPricingManager;
