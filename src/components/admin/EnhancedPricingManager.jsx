// src/components/admin/EnhancedPricingManager.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, doc, updateDoc, addDoc, query, where, getDocs, orderBy, writeBatch, deleteDoc } from 'firebase/firestore';
import { User, Building, Crown, AlertTriangle, Check, X, DollarSign, Percent, History, Upload, Download, Filter, Calculator, TrendingUp, Tag, Settings, Plus, Edit2, Trash2 } from 'lucide-react';
import { PricingService } from '../../services/pricingService';

const EnhancedPricingManager = () => {
  const [viewMode, setViewMode] = useState('markup-rules'); // 'markup-rules', 'tier', 'client'
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSpecificPricing, setClientSpecificPricing] = useState({});
  const [products, setProducts] = useState([]);
  const [tierPricing, setTierPricing] = useState({});
  const [markupRules, setMarkupRules] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedTier, setSelectedTier] = useState('tier_0');
  const [bulkUpdateMode, setBulkUpdateMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [pricingStats, setPricingStats] = useState(null);

  const tiers = [
    { id: 'tier_0', name: 'Public', color: 'bg-gray-100', icon: User, discount: 0 },
    { id: 'tier_1', name: 'End User', color: 'bg-blue-100', icon: DollarSign, discount: 5 },
    { id: 'tier_2', name: 'System Integrator', color: 'bg-green-100', icon: Building, discount: 15 },
    { id: 'tier_3', name: 'Trader', color: 'bg-purple-100', icon: Crown, discount: 25 },
    { id: 'tier_4', name: 'VIP Distributor', color: 'bg-yellow-100', icon: Crown, discount: 35 }
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
        loadClientSpecificPricing(),
        loadMarkupRules(),
        loadBrands(),
        loadPricingStats()
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

  const loadMarkupRules = async () => {
    try {
      const result = await PricingService.getMarkupRules();
      if (result.success) {
        setMarkupRules(result.data);
      }
    } catch (error) {
      console.error('Error loading markup rules:', error);
    }
  };

  const loadBrands = async () => {
    try {
      const brandsQuery = query(collection(db, 'brands'), orderBy('name'));
      const snapshot = await getDocs(brandsQuery);
      const brandsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBrands(brandsData);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  };

  const loadPricingStats = async () => {
    try {
      const stats = await PricingService.getPricingStats();
      setPricingStats(stats);
    } catch (error) {
      console.error('Error loading pricing stats:', error);
    }
  };

  const handleSaveMarkupRule = async (ruleData) => {
    try {
      setLoading(true);
      
      if (editingRule) {
        // Update existing rule
        const ruleRef = doc(db, 'pricing_markup_rules', editingRule.id);
        await updateDoc(ruleRef, {
          ...ruleData,
          lastModified: new Date()
        });
      } else {
        // Create new rule
        await PricingService.createMarkupRule(ruleData);
      }
      
      setShowRuleModal(false);
      setEditingRule(null);
      await loadMarkupRules();
      
      // Optionally recalculate pricing for affected products
      if (confirm('Would you like to recalculate pricing for all products with the updated rules?')) {
        await handleRecalculateAllPricing();
      }
    } catch (error) {
      console.error('Error saving markup rule:', error);
      alert('Error saving markup rule: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMarkupRule = async (ruleId) => {
    if (!confirm('Are you sure you want to delete this markup rule?')) {
      return;
    }

    try {
      setLoading(true);
      const ruleRef = doc(db, 'pricing_markup_rules', ruleId);
      await deleteDoc(ruleRef);
      await loadMarkupRules();
    } catch (error) {
      console.error('Error deleting markup rule:', error);
      alert('Error deleting markup rule: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateAllPricing = async () => {
    try {
      setLoading(true);
      const result = await PricingService.recalculateAllProductPricing();
      
      if (result.success) {
        alert(`Pricing recalculation completed:\n- Successful: ${result.data.successful}\n- Failed: ${result.data.failed}`);
        await loadPricingStats();
      } else {
        alert('Recalculation failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error recalculating pricing:', error);
      alert('Error recalculating pricing: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateExamplePricing = (rule, supplierCost = 100) => {
    const markupAmount = supplierCost * (rule.markupPercentage / 100);
    const publicPrice = supplierCost + markupAmount;
    
    return {
      supplierCost,
      markupAmount,
      publicPrice,
      markupPercentage: rule.markupPercentage
    };
  };

  const getRuleTypeIcon = (type) => {
    switch (type) {
      case 'brand': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'series': return <Tag className="w-4 h-4 text-blue-500" />;
      case 'brand_series': return <Crown className="w-4 h-4 text-purple-500" />;
      case 'category': return <User className="w-4 h-4 text-green-500" />;
      case 'global': return <Settings className="w-4 h-4 text-gray-500" />;
      default: return <Tag className="w-4 h-4 text-gray-400" />;
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

  // Markup Rules Card Component
  const MarkupRuleCard = ({ rule }) => {
    const example = calculateExamplePricing(rule);
    return (
      <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getRuleTypeIcon(rule.type)}
            <div>
              <h3 className="font-medium text-gray-900">{rule.name}</h3>
              <p className="text-xs text-gray-500">{rule.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              rule.priority >= 8 ? 'bg-red-100 text-red-800' :
              rule.priority >= 5 ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              Priority {rule.priority}
            </span>
            <button
              onClick={() => {
                setEditingRule(rule);
                setShowRuleModal(true);
              }}
              className="text-blue-600 hover:text-blue-900"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteMarkupRule(rule.id)}
              className="text-red-600 hover:text-red-900"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-gray-700">
            <strong>Scope:</strong> {rule.type === 'brand' && `Brand: ${rule.brandName}`}
            {rule.type === 'series' && `Series: ${rule.seriesName}`}
            {rule.type === 'brand_series' && `${rule.brandName} ${rule.seriesName}`}
            {rule.type === 'category' && `Category: ${rule.categoryId}`}
            {rule.type === 'global' && 'All products'}
            {rule.type === 'value_based' && `$${rule.minValue}+ items`}
          </div>
          
          <div className="text-lg font-bold text-green-600">
            +{rule.markupPercentage}% markup
          </div>
          
          <div className="bg-gray-50 p-2 rounded text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>Cost: ${example.supplierCost}</div>
              <div>+${example.markupAmount}</div>
              <div className="font-bold">= ${example.publicPrice}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Product Pricing Card with Markup Display
  const EnhancedProductPricingCard = ({ product }) => {
    const [calculatedPricing, setCalculatedPricing] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      calculateProductPricing();
    }, [product.id]);

    const calculateProductPricing = async () => {
      setLoading(true);
      try {
        const result = await PricingService.calculatePricingForProduct(product.id);
        if (result.success) {
          setCalculatedPricing(result.data);
        }
      } catch (error) {
        console.error('Error calculating pricing:', error);
      } finally {
        setLoading(false);
      }
    };

    if (loading) {
      return <div className="bg-white border rounded-lg p-4 animate-pulse h-48"></div>;
    }

    if (!calculatedPricing) {
      return (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">{product.name}</h3>
          <p className="text-red-600 text-sm">No cost data available</p>
        </div>
      );
    }

    return (
      <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="mb-3">
          <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
          <p className="text-xs text-gray-500">{product.brand} • {product.category}</p>
        </div>

        <div className="space-y-3">
          {/* Cost Breakdown */}
          <div className="bg-orange-50 p-3 rounded">
            <div className="text-xs font-medium text-orange-700 mb-1">Pricing Breakdown</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Supplier Cost:</span>
                <span className="font-medium">${calculatedPricing.supplierCost}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Markup ({calculatedPricing.totalMarkupPercentage}%):</span>
                <span className="font-medium">+${calculatedPricing.markupAmount}</span>
              </div>
              <div className="flex justify-between border-t border-orange-200 pt-1 font-bold">
                <span>Public Price:</span>
                <span>${calculatedPricing.publicPrice}</span>
              </div>
            </div>
          </div>

          {/* Applied Rules */}
          {calculatedPricing.appliedRules.length > 0 && (
            <div className="bg-blue-50 p-2 rounded">
              <div className="text-xs font-medium text-blue-700 mb-1">Applied Rules:</div>
              {calculatedPricing.appliedRules.map((rule, index) => (
                <div key={index} className="text-xs text-blue-600">
                  {rule.ruleName} (+{rule.markupPercentage}%)
                </div>
              ))}
            </div>
          )}

          {/* Tier Prices */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-700">Tier Prices:</div>
            {Object.values(calculatedPricing.tierPrices).slice(0, 3).map(tier => (
              <div key={tier.tierId} className="flex justify-between text-xs">
                <span className="text-gray-600">{tier.tierName}:</span>
                <span className="font-medium">${tier.finalPrice}</span>
              </div>
            ))}
          </div>

          {/* Update Cost Button */}
          <button
            onClick={() => {
              const newCost = prompt('Enter new supplier cost:', calculatedPricing.supplierCost);
              if (newCost && !isNaN(newCost)) {
                updateDoc(doc(db, 'products', product.id), {
                  supplierCost: parseFloat(newCost),
                  costLastUpdated: new Date()
                }).then(() => {
                  calculateProductPricing();
                });
              }
            }}
            className="w-full bg-gray-600 text-white py-1 px-2 rounded text-xs hover:bg-gray-700"
          >
            Update Cost
          </button>
        </div>
      </div>
    );
  };

  if (loading && markupRules.length === 0) {
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
        <p className="text-gray-600">Manage cost-based markup rules, tier pricing, and client-specific rates</p>
      </div>

      {/* Statistics */}
      {pricingStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Active Rules</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{pricingStats.activeMarkupRules}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">With Cost Data</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{pricingStats.productsWithCostData}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Special Pricing</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">{pricingStats.clientsWithSpecialPricing}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-gray-600">Avg Markup</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {pricingStats.averageMarkup.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div className="mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('markup-rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              viewMode === 'markup-rules'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calculator className="h-4 w-4" />
            Markup Rules
          </button>
          <button
            onClick={() => setViewMode('product-pricing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              viewMode === 'product-pricing'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Tag className="h-4 w-4" />
            Product Pricing
          </button>
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

      {/* Markup Rules View */}
      {viewMode === 'markup-rules' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Markup Rules Management</h2>
            <div className="flex gap-2">
              <button
                onClick={handleRecalculateAllPricing}
                disabled={loading}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Recalculate All Pricing
              </button>
              <button
                onClick={() => {
                  setEditingRule(null);
                  setShowRuleModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Markup Rule
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markupRules.map(rule => (
              <MarkupRuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        </div>
      )}

      {/* Product Pricing View */}
      {viewMode === 'product-pricing' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Product Pricing Overview</h2>
            <button
              onClick={handleRecalculateAllPricing}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Recalculate All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(product => (
              <EnhancedProductPricingCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Existing Tier-Based and Client-Specific Views */}
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
                  {tier.name} ({tier.discount}% off)
                </button>
              ))}
            </div>
          </div>

          {/* Note about markup-based pricing */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <Info className="h-4 w-4" />
              <span className="font-medium">Enhanced Pricing Active</span>
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Tier pricing is now automatically calculated from markup rules. 
              Manual overrides will take precedence over calculated prices.
            </p>
          </div>

          {/* Products Grid with calculated pricing display */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map(product => {
              const selectedTierObj = tiers.find(t => t.id === selectedTier);
              return (
                <EnhancedProductPricingCard key={product.id} product={product} />
              );
            })}
          </div>
        </div>
      )}

      {/* Client-Specific Pricing View - preserve existing functionality */}
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

          {/* Enhanced client pricing with calculated base prices */}
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
                  <EnhancedProductPricingCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Markup Rule Modal */}
      {showRuleModal && (
        <MarkupRuleModal
          rule={editingRule}
          brands={brands}
          onSave={handleSaveMarkupRule}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
          }}
          loading={loading}
        />
      )}
    </div>
  );
};

// Modal for creating/editing markup rules
const MarkupRuleModal = ({ rule, brands, onSave, onClose, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'global',
    markupPercentage: 100,
    priority: 5,
    combinable: false,
    brandName: '',
    seriesName: '',
    categoryId: '',
    minValue: '',
    maxValue: '',
    isActive: true,
    ...rule
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {rule ? 'Edit Markup Rule' : 'Create Markup Rule'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="global">Global (All Products)</option>
                <option value="brand">Brand-specific</option>
                <option value="series">Series-specific</option>
                <option value="brand_series">Brand + Series</option>
                <option value="category">Category-specific</option>
                <option value="value_based">Value-based</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Type-specific fields */}
          {formData.type === 'brand' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
              <select
                value={formData.brandName}
                onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Select Brand</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.name}>{brand.name}</option>
                ))}
              </select>
            </div>
          )}

          {formData.type === 'brand_series' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
                <select
                  value={formData.brandName}
                  onChange={(e) => setFormData(prev => ({ ...prev, brandName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select Brand</option>
                  {brands.map(brand => (
                    <option key={brand.id} value={brand.name}>{brand.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Series Name</label>
                <input
                  type="text"
                  value={formData.seriesName}
                  onChange={(e) => setFormData(prev => ({ ...prev, seriesName: e.target.value }))}
                  placeholder="e.g., 6ES, 6XV"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Markup Percentage (%)</label>
              <input
                type="number"
                value={formData.markupPercentage}
                onChange={(e) => setFormData(prev => ({ ...prev, markupPercentage: parseFloat(e.target.value) }))}
                min="0"
                max="1000"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-10)</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Behavior</label>
              <select
                value={formData.combinable}
                onChange={(e) => setFormData(prev => ({ ...prev, combinable: e.target.value === 'true' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="false">Exclusive</option>
                <option value="true">Combinable</option>
              </select>
            </div>
          </div>

          {/* Preview calculation */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview (Cost: $100)</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Supplier Cost</div>
                <div className="font-bold">$100.00</div>
              </div>
              <div>
                <div className="text-gray-600">Markup</div>
                <div className="font-bold text-green-600">+${(100 * (formData.markupPercentage / 100)).toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-600">Public Price</div>
                <div className="font-bold text-blue-600">${(100 + (100 * (formData.markupPercentage / 100))).toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (rule ? 'Update Rule' : 'Create Rule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedPricingManager;
