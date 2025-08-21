// src/components/admin/ClientOnboardingWizard.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, doc, addDoc, query, where, getDocs } from 'firebase/firestore';
import { UserPlus, Upload, CheckCircle, AlertCircle, Building, Mail, Phone, MapPin, Calendar, FileText, Crown, History, Calculator, TrendingUp, Info } from 'lucide-react';
import { PricingService } from '../../services/pricingService';

const ClientOnboardingWizard = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Client data state
  const [clientData, setClientData] = useState({
    // Basic Information
    name: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
    
    // Business Information
    companyRegistration: '',
    taxId: '',
    industry: '',
    companySize: '',
    
    // Account Settings
    defaultTierId: 'tier_1',
    accountManager: '',
    creditLimit: 0,
    paymentTerms: 'Net 30',
    
    // Enhanced Pricing Settings
    importPriceHistory: true,
    hasExistingPricing: false,
    specialPricingNotes: '',
    autoCalculatePricing: true,
    preferredMarkupStrategy: 'standard' // 'standard', 'premium', 'volume'
  });

  // Price history data
  const [priceHistoryFile, setPriceHistoryFile] = useState(null);
  const [parsedPriceData, setParsedPriceData] = useState([]);
  const [importStats, setImportStats] = useState(null);
  const [pricingPreview, setPricingPreview] = useState(null);

  const steps = [
    { id: 1, name: 'Basic Info', icon: Building },
    { id: 2, name: 'Business Details', icon: FileText },
    { id: 3, name: 'Account Setup', icon: UserPlus },
    { id: 4, name: 'Pricing Strategy', icon: Calculator },
    { id: 5, name: 'Price History', icon: History },
    { id: 6, name: 'Review & Complete', icon: CheckCircle }
  ];

  const tiers = [
    { id: 'tier_0', name: 'Public', description: 'Standard public pricing', discount: 0 },
    { id: 'tier_1', name: 'End User', description: 'Direct customer pricing', discount: 5 },
    { id: 'tier_2', name: 'System Integrator', description: 'Partner pricing', discount: 15 },
    { id: 'tier_3', name: 'Trader', description: 'Distributor pricing', discount: 25 },
    { id: 'tier_4', name: 'VIP Distributor', description: 'Premium partner pricing', discount: 35 }
  ];

  const markupStrategies = [
    { 
      id: 'standard', 
      name: 'Standard Markup', 
      description: 'Uses default markup rules based on product categories and brands',
      impact: 'Competitive pricing with standard profit margins'
    },
    { 
      id: 'premium', 
      name: 'Premium Strategy', 
      description: 'Higher markup for premium positioning',
      impact: 'Higher margins, positioned as premium supplier'
    },
    { 
      id: 'volume', 
      name: 'Volume Strategy', 
      description: 'Lower markup for volume customers',
      impact: 'Competitive pricing to encourage larger orders'
    }
  ];

  const industries = [
    'Manufacturing', 'Construction', 'Oil & Gas', 'Mining', 'Agriculture',
    'Transportation', 'Utilities', 'Technology', 'Healthcare', 'Other'
  ];

  const companySizes = [
    '1-10 employees', '11-50 employees', '51-200 employees', 
    '201-1000 employees', '1000+ employees'
  ];

  useEffect(() => {
    if (currentStep === 4) {
      generatePricingPreview();
    }
  }, [clientData.defaultTierId, clientData.preferredMarkupStrategy]);

  const generatePricingPreview = async () => {
    try {
      // Get a sample of products to show pricing preview
      const productsQuery = query(collection(db, 'products'));
      const snapshot = await getDocs(productsQuery);
      const sampleProducts = snapshot.docs.slice(0, 3).map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const preview = [];
      for (const product of sampleProducts) {
        try {
          const pricingResult = await PricingService.calculatePricingForProduct(product.id);
          if (pricingResult.success) {
            const tierPrice = pricingResult.data.tierPrices[clientData.defaultTierId];
            preview.push({
              product,
              pricing: pricingResult.data,
              clientPrice: tierPrice
            });
          }
        } catch (error) {
          console.error('Error calculating pricing preview:', error);
        }
      }
      
      setPricingPreview(preview);
    } catch (error) {
      console.error('Error generating pricing preview:', error);
    }
  };

  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 1:
        if (!clientData.name.trim()) errors.name = 'Company name is required';
        if (!clientData.email.trim()) errors.email = 'Email is required';
        if (clientData.email && !/\S+@\S+\.\S+/.test(clientData.email)) {
          errors.email = 'Please enter a valid email address';
        }
        if (!clientData.contactPerson.trim()) errors.contactPerson = 'Contact person is required';
        break;
      
      case 2:
        if (!clientData.industry) errors.industry = 'Industry selection is required';
        if (!clientData.companySize) errors.companySize = 'Company size is required';
        break;
      
      case 3:
        if (!clientData.accountManager.trim()) errors.accountManager = 'Account manager is required';
        if (!clientData.defaultTierId) errors.defaultTierId = 'Default tier selection is required';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleInputChange = (field, value) => {
    setClientData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const parsePriceHistoryFile = (file) => {
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
            case 'final_price':
              record.price = parseFloat(value) || 0;
              break;
            case 'cost':
            case 'supplier_cost':
            case 'base_cost':
              record.supplierCost = parseFloat(value) || 0;
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
            case 'public_price':
              record.originalPrice = parseFloat(value) || 0;
              break;
            case 'markup_percentage':
            case 'markup':
              record.markupPercentage = parseFloat(value) || 0;
              break;
            case 'notes':
            case 'remarks':
              record.notes = value;
              break;
          }
        });
        
        if (record.productId && record.price > 0) {
          record.priceType = 'sold';
          record.recordType = 'historical_import';
          data.push(record);
        }
      }
      
      setParsedPriceData(data);
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPriceHistoryFile(file);
      parsePriceHistoryFile(file);
    }
  };

  const completeOnboarding = async () => {
    if (!validateStep(currentStep)) return;

    setProcessing(true);
    try {
      // 1. Create client record with enhanced pricing settings
      const clientRef = await addDoc(collection(db, 'clients'), {
        ...clientData,
        isActive: true,
        createdAt: new Date(),
        onboardingDate: new Date(),
        onboardingCompletedBy: 'current_user_id', // Replace with actual user ID
        pricingSettings: {
          autoCalculatePricing: clientData.autoCalculatePricing,
          preferredMarkupStrategy: clientData.preferredMarkupStrategy,
          useHistoricalPricing: clientData.importPriceHistory && parsedPriceData.length > 0
        }
      });

      const clientId = clientRef.id;

      // 2. Import price history if provided
      let importResult = null;
      if (clientData.importPriceHistory && parsedPriceData.length > 0) {
        importResult = await PricingService.importHistoricalPrices(clientId, parsedPriceData);
        setImportStats(importResult);
      }

      // 3. Create onboarding completion record with enhanced data
      await addDoc(collection(db, 'client_onboarding'), {
        clientId,
        onboardingDate: new Date(),
        historicalPricesImported: !!importResult?.success,
        pricesImportedCount: importResult?.importedCount || 0,
        pricingStrategy: clientData.preferredMarkupStrategy,
        autoCalculatedPricing: clientData.autoCalculatePricing,
        status: 'completed',
        completedBy: 'current_user_id', // Replace with actual user ID
        clientData: {
          name: clientData.name,
          email: clientData.email,
          defaultTier: clientData.defaultTierId,
          accountManager: clientData.accountManager,
          industry: clientData.industry,
          companySize: clientData.companySize
        }
      });

      // 4. If auto-calculate is enabled, trigger pricing calculation for products
      if (clientData.autoCalculatePricing) {
        try {
          await PricingService.recalculateAllProductPricing();
        } catch (error) {
          console.error('Error triggering pricing recalculation:', error);
        }
      }

      setOnboardingComplete(true);
      
      // Call parent callback if provided
      if (onComplete) {
        onComplete({
          clientId,
          clientData,
          importStats: importResult
        });
      }

    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Error completing onboarding. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Step Components (keeping existing BasicInfoStep, BusinessDetailsStep, AccountSetupStep)
  const BasicInfoStep = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name *
          </label>
          <input
            type="text"
            value={clientData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              validationErrors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter company name"
          />
          {validationErrors.name && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            value={clientData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              validationErrors.email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="company@example.com"
          />
          {validationErrors.email && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Person *
          </label>
          <input
            type="text"
            value={clientData.contactPerson}
            onChange={(e) => handleInputChange('contactPerson', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              validationErrors.contactPerson ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Primary contact name"
          />
          {validationErrors.contactPerson && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.contactPerson}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={clientData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="+60 12-345 6789"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Company Address
        </label>
        <textarea
          value={clientData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows="3"
          placeholder="Full company address"
        />
      </div>
    </div>
  );

  const BusinessDetailsStep = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Business Details</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Industry *
          </label>
          <select
            value={clientData.industry}
            onChange={(e) => handleInputChange('industry', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              validationErrors.industry ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select Industry</option>
            {industries.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
          {validationErrors.industry && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.industry}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Size *
          </label>
          <select
            value={clientData.companySize}
            onChange={(e) => handleInputChange('companySize', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              validationErrors.companySize ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Select Company Size</option>
            {companySizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          {validationErrors.companySize && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.companySize}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Registration No.
          </label>
          <input
            type="text"
            value={clientData.companyRegistration}
            onChange={(e) => handleInputChange('companyRegistration', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="ROC/SSM Number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tax ID / GST Number
          </label>
          <input
            type="text"
            value={clientData.taxId}
            onChange={(e) => handleInputChange('taxId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="GST/Tax ID Number"
          />
        </div>
      </div>
    </div>
  );

  const AccountSetupStep = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Account Setup</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default Pricing Tier *
          </label>
          <select
            value={clientData.defaultTierId}
            onChange={(e) => handleInputChange('defaultTierId', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              validationErrors.defaultTierId ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            {tiers.map(tier => (
              <option key={tier.id} value={tier.id}>
                {tier.name} - {tier.description} ({tier.discount}% off public)
              </option>
            ))}
          </select>
          {validationErrors.defaultTierId && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.defaultTierId}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Manager *
          </label>
          <input
            type="text"
            value={clientData.accountManager}
            onChange={(e) => handleInputChange('accountManager', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              validationErrors.accountManager ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Assigned sales representative"
          />
          {validationErrors.accountManager && (
            <p className="text-red-500 text-xs mt-1">{validationErrors.accountManager}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Credit Limit
          </label>
          <input
            type="number"
            value={clientData.creditLimit}
            onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="0"
            step="1000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Terms
          </label>
          <select
            value={clientData.paymentTerms}
            onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="Cash">Cash</option>
            <option value="Net 7">Net 7 Days</option>
            <option value="Net 15">Net 15 Days</option>
            <option value="Net 30">Net 30 Days</option>
            <option value="Net 60">Net 60 Days</option>
            <option value="Net 90">Net 90 Days</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Special Pricing Notes
        </label>
        <textarea
          value={clientData.specialPricingNotes}
          onChange={(e) => handleInputChange('specialPricingNotes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows="3"
          placeholder="Any special pricing arrangements, volume discounts, or negotiated terms"
        />
      </div>
    </div>
  );

  // NEW: Enhanced Pricing Strategy Step
  const PricingStrategyStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Pricing Strategy</h2>
      
      {/* Auto-Calculate Pricing Toggle */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Calculator className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={clientData.autoCalculatePricing}
                onChange={(e) => handleInputChange('autoCalculatePricing', e.target.checked)}
                className="rounded"
              />
              <span className="font-medium text-blue-900">Enable automatic markup-based pricing</span>
            </label>
            <p className="text-sm text-blue-700 mt-1">
              Uses cost-based markup rules to calculate optimal pricing based on product brands, series, and categories.
            </p>
          </div>
        </div>
      </div>

      {/* Markup Strategy Selection */}
      {clientData.autoCalculatePricing && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Markup Strategy</h3>
          <div className="space-y-3">
            {markupStrategies.map(strategy => (
              <label key={strategy.id} className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="markupStrategy"
                  value={strategy.id}
                  checked={clientData.preferredMarkupStrategy === strategy.id}
                  onChange={(e) => handleInputChange('preferredMarkupStrategy', e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{strategy.name}</div>
                  <div className="text-sm text-gray-600">{strategy.description}</div>
                  <div className="text-xs text-blue-600 mt-1">{strategy.impact}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Preview */}
      {pricingPreview && pricingPreview.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Pricing Preview</h3>
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Supplier Cost</th>
                    <th className="px-4 py-3 text-left">Markup</th>
                    <th className="px-4 py-3 text-left">Public Price</th>
                    <th className="px-4 py-3 text-left">Your Price</th>
                    <th className="px-4 py-3 text-left">Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pricingPreview.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-xs text-gray-500">{item.product.brand}</div>
                      </td>
                      <td className="px-4 py-3">${item.pricing.supplierCost?.toFixed(2) || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className="text-green-600">+{item.pricing.totalMarkupPercentage}%</span>
                      </td>
                      <td className="px-4 py-3">${item.pricing.publicPrice?.toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium">${item.clientPrice?.finalPrice?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {item.clientPrice?.discountPercentage > 0 && (
                          <span className="text-green-600">-{item.clientPrice.discountPercentage}%</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Sample pricing based on current markup rules and selected tier
          </p>
        </div>
      )}

      {/* Manual Pricing Note */}
      {!clientData.autoCalculatePricing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-900">Manual Pricing Mode</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Pricing will need to be set manually for each product. Historical prices (if imported) 
                will be used where available, otherwise tier-based pricing will apply.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const PriceHistoryStep = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Price History Import</h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <History className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Enhanced Price History Import</h3>
            <p className="text-sm text-blue-700 mt-1">
              Import historical pricing data to ensure seamless transition. Supports both final prices 
              and supplier costs for more accurate markup calculations.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={clientData.importPriceHistory}
            onChange={(e) => handleInputChange('importPriceHistory', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium">Import historical pricing data for this client</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Historical prices will be automatically applied as client-specific pricing
        </p>
      </div>

      {clientData.importPriceHistory && (
        <div>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 mb-2">Upload CSV with client's price history</p>
            <p className="text-sm text-gray-500 mb-4">
              Enhanced columns: product_id, price, supplier_cost, quantity, sale_date, order_id, contract_ref, markup_percentage, notes
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Enhanced CSV Preview */}
          {parsedPriceData.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h4 className="font-medium mb-3">Preview ({parsedPriceData.length} records)</h4>
              <div className="overflow-x-auto max-h-48 border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Product ID</th>
                      <th className="px-3 py-2 text-left">Final Price</th>
                      <th className="px-3 py-2 text-left">Supplier Cost</th>
                      <th className="px-3 py-2 text-left">Markup %</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {parsedPriceData.slice(0, 5).map((record, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2">{record.productId}</td>
                        <td className="px-3 py-2">${record.price?.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          {record.supplierCost ? `$${record.supplierCost.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-3 py-2">
                          {record.markupPercentage ? `${record.markupPercentage}%` : '-'}
                        </td>
                        <td className="px-3 py-2">{record.quantity}</td>
                        <td className="px-3 py-2">
                          {record.soldDate ? new Date(record.soldDate).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedPriceData.length > 5 && (
                <p className="text-sm text-gray-500 mt-2">
                  Showing first 5 records of {parsedPriceData.length} total
                </p>
              )}
              
              {/* Data Quality Indicators */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="font-medium">With Costs:</span>
                    <span className="ml-1">
                      {parsedPriceData.filter(r => r.supplierCost > 0).length} records
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">With Markup:</span>
                    <span className="ml-1">
                      {parsedPriceData.filter(r => r.markupPercentage > 0).length} records
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">With Dates:</span>
                    <span className="ml-1">
                      {parsedPriceData.filter(r => r.soldDate).length} records
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const ReviewStep = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Review & Complete</h2>
      
      {/* Client Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold mb-4">Client Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Company:</span>
            <div>{clientData.name}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Email:</span>
            <div>{clientData.email}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Contact:</span>
            <div>{clientData.contactPerson}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Phone:</span>
            <div>{clientData.phone || 'Not provided'}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Industry:</span>
            <div>{clientData.industry}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Company Size:</span>
            <div>{clientData.companySize}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Default Tier:</span>
            <div>{tiers.find(t => t.id === clientData.defaultTierId)?.name}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Account Manager:</span>
            <div>{clientData.accountManager}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Payment Terms:</span>
            <div>{clientData.paymentTerms}</div>
          </div>
          <div>
            <span className="font-medium text-gray-700">Credit Limit:</span>
            <div>${clientData.creditLimit.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Pricing Strategy Summary */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <h3 className="font-semibold text-orange-900 mb-2">Pricing Strategy</h3>
        <div className="text-sm text-orange-700">
          {clientData.autoCalculatePricing ? (
            <div>
              <div>✅ Automatic markup-based pricing enabled</div>
              <div>📊 Strategy: {markupStrategies.find(s => s.id === clientData.preferredMarkupStrategy)?.name}</div>
              <div>🎯 Tier: {tiers.find(t => t.id === clientData.defaultTierId)?.name} ({tiers.find(t => t.id === clientData.defaultTierId)?.discount}% discount)</div>
            </div>
          ) : (
            <div>⚠️ Manual pricing mode - prices will need to be set individually</div>
          )}
        </div>
      </div>

      {/* Price History Summary */}
      {clientData.importPriceHistory && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Price History Import</h3>
          {parsedPriceData.length > 0 ? (
            <div className="text-sm text-blue-700">
              <div>✅ {parsedPriceData.length} historical price records ready for import</div>
              <div>📄 File: {priceHistoryFile?.name}</div>
              <div>💰 Records with cost data: {parsedPriceData.filter(r => r.supplierCost > 0).length}</div>
            </div>
          ) : (
            <div className="text-sm text-blue-700">
              ⚠️ No price history file uploaded - client will use calculated pricing
            </div>
          )}
        </div>
      )}

      {/* What happens next */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="font-semibold text-green-900 mb-2">What happens after completion:</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>✅ Client account will be created with specified settings</li>
          {clientData.autoCalculatePricing && (
            <li>✅ Pricing will be automatically calculated using markup rules</li>
          )}
          {clientData.importPriceHistory && parsedPriceData.length > 0 && (
            <li>✅ Historical prices will be imported and applied automatically</li>
          )}
          <li>✅ Client can immediately log in and see their pricing</li>
          <li>✅ Account manager will be notified of the new client setup</li>
        </ul>
      </div>
    </div>
  );

  // Rest of the component remains the same (completion state, navigation, etc.)
  if (onboardingComplete) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Onboarding Complete!</h1>
          <p className="text-gray-600 mb-6">
            {clientData.name} has been successfully onboarded to the HiggsFlow platform.
          </p>

          {/* Enhanced Completion Stats */}
          {importStats && (
            <div className="bg-white border rounded-lg p-6 mb-6">
              <h3 className="font-semibold mb-4">Import Results</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{importStats.importedCount || 0}</div>
                  <div className="text-gray-600">Prices Imported</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{importStats.importedPrices?.length || 0}</div>
                  <div className="text-gray-600">Products Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {importStats.success ? '100%' : '0%'}
                  </div>
                  <div className="text-gray-600">Success Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-3">Next Steps:</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send login credentials to {clientData.email}
              </li>
              <li className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Notify {clientData.accountManager} about the new client
              </li>
              <li className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                {clientData.autoCalculatePricing ? 'Review calculated pricing' : 'Set up manual pricing'}
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule client orientation call
              </li>
            </ul>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={() => {
                setCurrentStep(1);
                setOnboardingComplete(false);
                setClientData({
                  name: '', email: '', phone: '', address: '', contactPerson: '',
                  companyRegistration: '', taxId: '', industry: '', companySize: '',
                  defaultTierId: 'tier_1', accountManager: '', creditLimit: 0,
                  paymentTerms: 'Net 30', importPriceHistory: true,
                  hasExistingPricing: false, specialPricingNotes: '',
                  autoCalculatePricing: true, preferredMarkupStrategy: 'standard'
                });
                setPriceHistoryFile(null);
                setParsedPriceData([]);
                setImportStats(null);
                setPricingPreview(null);
              }}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Onboard Another Client
            </button>
            <button
              onClick={() => window.location.href = '/admin/clients'}
              className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
            >
              View All Clients
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Enhanced Client Onboarding</h1>
        <p className="text-gray-600">Set up a new client with automated pricing, markup strategies, and pricing history</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= step.id 
                    ? 'bg-blue-100 text-blue-600 border-2 border-blue-300' 
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span className={`text-xs mt-2 ${
                  currentStep >= step.id ? 'text-blue-600 font-medium' : 'text-gray-500'
                }`}>
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  currentStep > step.id ? 'bg-blue-300' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        {currentStep === 1 && <BasicInfoStep />}
        {currentStep === 2 && <BusinessDetailsStep />}
        {currentStep === 3 && <AccountSetupStep />}
        {currentStep === 4 && <PricingStrategyStep />}
        {currentStep === 5 && <PriceHistoryStep />}
        {currentStep === 6 && <ReviewStep />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {currentStep < steps.length ? (
          <button
            onClick={nextStep}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Next Step
          </button>
        ) : (
          <button
            onClick={completeOnboarding}
            disabled={processing}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Complete Onboarding
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default ClientOnboardingWizard;
