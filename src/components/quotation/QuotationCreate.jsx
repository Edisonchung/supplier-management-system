/**
 * QuotationCreate.jsx
 * 
 * Comprehensive quotation creation form
 * Features: Company selection, client picker, product lines, pricing, descriptions, shipping
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Send, Plus, Trash2, Calculator, FileText, Building2,
  Users, Package, DollarSign, Truck, FileCheck, AlertCircle, Sparkles,
  Copy, Eye, ChevronDown, ChevronUp, Settings, Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClients } from '../../hooks/useClients';
import QuotationService from '../../services/QuotationService';
import QuotationPricingService from '../../services/QuotationPricingService';
import ClientService from '../../services/ClientService';
import QuotationLineForm from './forms/QuotationLineForm';
import ProductSearchModal from './forms/ProductSearchModal';
import ContactSelector from './forms/ContactSelector';
import DiscountCalculator from './pricing/DiscountCalculator';
import ShippingCalculator from './shipping/ShippingCalculator';
import DummyQuoteGenerator from './workflow/DummyQuoteGenerator';
import { formatCurrency } from '../../utils/formatters';

// Company configuration
const COMPANIES = [
  { id: 'flow-solution', code: 'FS', name: 'Flow Solution Sdn Bhd' },
  { id: 'flow-solution-engineering', code: 'FSE', name: 'Flow Solution Engineering Sdn Bhd' },
  { id: 'flow-solution-penang', code: 'FSP', name: 'Flow Solution (Penang) Sdn Bhd' },
  { id: 'broadwater-solution', code: 'BWS', name: 'Broadwater Solution Sdn Bhd' },
  { id: 'broadwater-engineering', code: 'BWE', name: 'Broadwater Engineering Sdn Bhd' },
  { id: 'emi-technology', code: 'EMIT', name: 'EMI Technology Sdn Bhd' },
  { id: 'emi-automation', code: 'EMIA', name: 'EMI Automation Sdn Bhd' },
  { id: 'futuresmiths', code: 'FTS', name: 'Futuresmiths Sdn Bhd' },
  { id: 'inhaus', code: 'IHS', name: 'Inhaus Sdn Bhd' }
];

const CURRENCIES = [
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'RMB', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
];

const DEFAULT_QUOTATION = {
  companyId: 'flow-solution',
  companyCode: 'FS',
  companyName: 'Flow Solution Sdn Bhd',
  status: 'draft',
  clientId: '',
  clientName: '',
  clientTier: 'end_user',
  billingAddress: { company: '', attention: '', address1: '', address2: '', city: '', state: '', postalCode: '', country: 'Malaysia' },
  deliveryAddress: null,
  attentionContacts: [],
  subject: '',
  systemName: '',
  currency: 'MYR',
  validityDays: 30,
  discountType: 'none',
  discountPercentage: 0,
  discountAmount: 0,
  taxType: 'none',
  taxRate: 0,
  shippingMethod: 'ex_works',
  shippingCost: 0,
  shippingIncluded: false,
  paymentTerms: '30% Advance, 70% Before Delivery',
  deliveryTerms: 'Ex-Works',
  deliveryLeadTime: '4-6 weeks ARO',
  warranty: '12 months from commissioning',
  notes: '',
  internalNotes: '',
  jobCodeId: '',
  jobCode: '',
  pdfConfig: {
    showCostPrice: false,
    showMargin: false,
    showLineDiscount: true,
    showOverallDiscount: true,
    showDimensions: false,
    showWeight: false,
    showSKU: true,
    showClientMaterialCode: true,
    showLeadTime: true,
    showBrandLogo: true,
    template: 'standard'
  }
};

const DEFAULT_LINE = {
  lineNumber: 10,
  productSource: 'catalog',
  productId: '',
  sku: '',
  partNumber: '',
  clientMaterialCode: '',
  brand: '',
  category: '',
  descriptionSource: 'standard',
  standardDescription: '',
  aiGeneratedDescription: '',
  customDescription: '',
  description: '',
  quantity: 1,
  uom: 'pcs',
  pricingSource: 'manual',
  listPrice: 0,
  discountFromList: 0,
  nettCost: 0,
  costPrice: 0,
  markupPercentage: 0,
  unitPrice: 0,
  lineDiscountType: 'none',
  lineDiscountPercentage: 0,
  lineDiscountAmount: 0,
  lineTotal: 0,
  dimensions: null,
  weight: null,
  leadTime: '',
  stockStatus: 'order_required',
  notes: '',
  internalNotes: '',
  isSystemComponent: false,
  hideFromPDF: false,
  hiddenFields: []
};

const QuotationCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clients, loading: clientsLoading } = useClients();

  // Main state
  const [quotation, setQuotation] = useState(DEFAULT_QUOTATION);
  const [lines, setLines] = useState([]);
  const [totals, setTotals] = useState({ subtotal: 0, discount: 0, tax: 0, shipping: 0, grandTotal: 0 });
  
  // UI state
  const [activeSection, setActiveSection] = useState('header');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [showDummyGenerator, setShowDummyGenerator] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState(null);
  const [expandedLines, setExpandedLines] = useState({});
  const [selectedClient, setSelectedClient] = useState(null);
  const [tierPricing, setTierPricing] = useState(null);

  // Load tier pricing when client changes
  useEffect(() => {
    const loadTierPricing = async () => {
      if (quotation.clientTier) {
        try {
          const pricing = await QuotationPricingService.getTierMarkup(quotation.clientTier);
          setTierPricing(pricing);
        } catch (err) {
          console.error('Error loading tier pricing:', err);
        }
      }
    };
    loadTierPricing();
  }, [quotation.clientTier]);

  // Calculate totals when lines or discount changes
  useEffect(() => {
    const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
    let discount = 0;
    if (quotation.discountType === 'percentage') {
      discount = subtotal * (quotation.discountPercentage / 100);
    } else if (quotation.discountType === 'lump_sum') {
      discount = quotation.discountAmount || 0;
    }
    
    const afterDiscount = subtotal - discount;
    let tax = 0;
    if (quotation.taxType === 'sst' || quotation.taxType === 'exclusive') {
      tax = afterDiscount * (quotation.taxRate / 100);
    }
    
    const shipping = quotation.shippingIncluded ? 0 : (quotation.shippingCost || 0);
    const grandTotal = afterDiscount + tax + shipping;

    setTotals({ subtotal, discount, tax, shipping, grandTotal });
  }, [lines, quotation.discountType, quotation.discountPercentage, quotation.discountAmount, 
      quotation.taxType, quotation.taxRate, quotation.shippingCost, quotation.shippingIncluded]);

  // Handlers
  const handleCompanyChange = (companyId) => {
    const company = COMPANIES.find(c => c.id === companyId);
    if (company) {
      setQuotation(prev => ({
        ...prev,
        companyId: company.id,
        companyCode: company.code,
        companyName: company.name
      }));
    }
  };

  const handleClientSelect = async (client) => {
    setSelectedClient(client);
    const contactsResponse = await ClientService.getClientContacts(client.id);
    const clientContacts = contactsResponse?.data || [];
    const primaryContact = clientContacts.find(c => c.isPrimary) || clientContacts[0];
    
    setQuotation(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.name,
      clientTier: client.tier || 'end_user',
      clientInternalCode: client.materialCodePrefix || '',
      billingAddress: {
        company: client.name,
        attention: primaryContact?.name || '',
        address1: client.address?.line1 || '',
        address2: client.address?.line2 || '',
        city: client.address?.city || '',
        state: client.address?.state || '',
        postalCode: client.address?.postalCode || '',
        country: client.address?.country || 'Malaysia'
      },
      paymentTerms: client.defaultPaymentTerms || prev.paymentTerms,
      attentionContacts: primaryContact ? [{
        id: primaryContact.id,
        name: primaryContact.name,
        title: primaryContact.title,
        email: primaryContact.email,
        phone: primaryContact.phone,
        isPrimary: true
      }] : []
    }));

    // Recalculate line pricing with new tier
    if (lines.length > 0 && client.tier !== quotation.clientTier) {
      const updatedLines = await Promise.all(lines.map(async (line) => {
        if (line.costPrice > 0) {
          const pricing = await QuotationPricingService.calculateQuotationLinePricing({
            ...line,
            clientTier: client.tier,
            quotationCurrency: quotation.currency
          });
          return { ...line, ...pricing };
        }
        return line;
      }));
      setLines(updatedLines);
    }
  };

  const handleAddLine = () => {
    const newLineNumber = lines.length > 0 
      ? Math.max(...lines.map(l => l.lineNumber)) + 10 
      : 10;
    
    setLines(prev => [...prev, { ...DEFAULT_LINE, lineNumber: newLineNumber }]);
    setExpandedLines(prev => ({ ...prev, [lines.length]: true }));
  };

  const handleUpdateLine = async (index, updates) => {
    const line = { ...lines[index], ...updates };
    
    // Recalculate pricing if cost or markup changed
    if ('costPrice' in updates || 'markupPercentage' in updates || 'quantity' in updates || 
        'lineDiscountPercentage' in updates || 'lineDiscountAmount' in updates) {
      const unitPrice = line.costPrice * (1 + line.markupPercentage / 100);
      let lineDiscount = 0;
      if (line.lineDiscountType === 'percentage') {
        lineDiscount = unitPrice * line.quantity * (line.lineDiscountPercentage / 100);
      } else if (line.lineDiscountType === 'amount') {
        lineDiscount = line.lineDiscountAmount || 0;
      }
      const lineTotal = (unitPrice * line.quantity) - lineDiscount;
      
      line.unitPrice = unitPrice;
      line.lineTotal = lineTotal;
    }

    setLines(prev => prev.map((l, i) => i === index ? line : l));
  };

  const handleRemoveLine = (index) => {
    if (window.confirm('Are you sure you want to remove this line?')) {
      setLines(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleProductSelect = async (product) => {
    const lineIndex = editingLineIndex !== null ? editingLineIndex : lines.length;
    
    // Get pricing for product
    const pricing = await QuotationPricingService.calculateQuotationLinePricing({
      productId: product.id,
      brand: product.brand,
      category: product.category,
      clientTier: quotation.clientTier,
      quotationCurrency: quotation.currency
    });

    const newLine = {
      ...DEFAULT_LINE,
      lineNumber: lineIndex * 10 + 10,
      productSource: 'catalog',
      productId: product.id,
      sku: product.sku || '',
      partNumber: product.partNumber || product.sku || '',
      brand: product.brand || '',
      category: product.category || '',
      descriptionSource: 'standard',
      standardDescription: product.description || '',
      description: product.description || '',
      quantity: 1,
      uom: product.uom || 'pcs',
      ...pricing,
      leadTime: product.leadTime || '',
      stockStatus: product.stockStatus || 'order_required'
    };

    if (editingLineIndex !== null) {
      setLines(prev => prev.map((l, i) => i === editingLineIndex ? newLine : l));
    } else {
      setLines(prev => [...prev, newLine]);
    }

    setShowProductSearch(false);
    setEditingLineIndex(null);
  };

  const handleSave = async (status = 'draft') => {
    // Validation
    const newErrors = {};
    if (!quotation.clientId) newErrors.client = 'Please select a client';
    if (!quotation.subject) newErrors.subject = 'Please enter a subject';
    if (lines.length === 0) newErrors.lines = 'Please add at least one line item';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + quotation.validityDays);

      const quotationData = {
        ...quotation,
        status,
        validUntil,
        subtotal: totals.subtotal,
        discountAmount: totals.discount,
        taxAmount: totals.tax,
        grandTotal: totals.grandTotal,
        grandTotalMYR: quotation.currency === 'MYR' ? totals.grandTotal : 
          await QuotationPricingService.convertToMYR(totals.grandTotal, quotation.currency)
      };

      const result = await QuotationService.createQuotation(quotationData, lines, user.uid);
      
      if (status === 'draft') {
        navigate(`/quotations/${result.id}/edit`);
      } else {
        navigate(`/quotations/${result.id}`);
      }
    } catch (err) {
      console.error('Error saving quotation:', err);
      setErrors({ save: 'Failed to save quotation. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDummyQuotes = async (selectedCompanies) => {
    if (!quotation.clientId || lines.length === 0) {
      alert('Please complete the quotation before generating dummy quotes');
      return;
    }

    try {
      setSaving(true);
      // First save the main quotation
      const mainResult = await handleSave('draft');
      
      // Then generate dummy quotes
      const dummyQuotes = await QuotationService.createDummyQuotes(
        mainResult.id,
        selectedCompanies,
        user.uid
      );

      alert(`Created ${dummyQuotes.length} dummy quotes successfully!`);
      setShowDummyGenerator(false);
    } catch (err) {
      console.error('Error generating dummy quotes:', err);
      alert('Failed to generate dummy quotes');
    } finally {
      setSaving(false);
    }
  };

  const toggleLineExpand = (index) => {
    setExpandedLines(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Section navigation
  const sections = [
    { id: 'header', label: 'Header', icon: FileText },
    { id: 'lines', label: 'Line Items', icon: Package },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'shipping', label: 'Shipping', icon: Truck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/quotations')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Quotation</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {quotation.companyCode} • {quotation.currency}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDummyGenerator(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <Copy className="w-4 h-4" /> Dummy Quotes
            </button>
            <button onClick={() => handleSave('draft')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              <Save className="w-4 h-4" /> Save Draft
            </button>
            <button onClick={() => handleSave('pending_approval')} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Send className="w-4 h-4" /> Submit for Approval
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="px-6 flex gap-1 border-t border-gray-200 dark:border-gray-700">
          {sections.map(section => (
            <button key={section.id} onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeSection === section.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <section.icon className="w-4 h-4" />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {errors.save && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700 dark:text-red-400">{errors.save}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Section */}
          {activeSection === 'header' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" /> Quotation Header
              </h2>
              
              {/* Company Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quoting Company *
                  </label>
                  <select value={quotation.companyId} onChange={(e) => handleCompanyChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    {COMPANIES.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency *
                  </label>
                  <select value={quotation.currency} 
                    onChange={(e) => setQuotation(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client * {errors.client && <span className="text-red-500 text-xs ml-2">{errors.client}</span>}
                </label>
                <div className="flex gap-2">
                  <select value={quotation.clientId}
                    onChange={(e) => {
                      const client = clients?.find(c => c.id === e.target.value);
                      if (client) handleClientSelect(client);
                    }}
                    className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${
                      errors.client ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}>
                    <option value="">Select a client...</option>
                    {clients?.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.tier || 'No tier'})</option>
                    ))}
                  </select>
                  <button onClick={() => setShowContactSelector(true)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Users className="w-4 h-4" />
                  </button>
                </div>
                
                {selectedClient && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedClient.name}</span>
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs capitalize">
                        {selectedClient.tier?.replace('_', ' ') || 'No tier'}
                      </span>
                    </div>
                    {tierPricing && (
                      <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Default markup: {tierPricing.defaultMarkup}%
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Subject */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject * {errors.subject && <span className="text-red-500 text-xs ml-2">{errors.subject}</span>}
                </label>
                <input type="text" value={quotation.subject}
                  onChange={(e) => setQuotation(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., Supply of Grundfos CR Pumps for Water Treatment Plant"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 ${
                    errors.subject ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`} />
              </div>

              {/* Attention Contacts */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attention To
                </label>
                <div className="space-y-2">
                  {quotation.attentionContacts.map((contact, i) => (
                    <div key={contact.id || i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div className="flex-1">
                        <span className="font-medium">{contact.name}</span>
                        {contact.title && <span className="text-gray-500 ml-2">({contact.title})</span>}
                        <span className="text-gray-500 ml-2">{contact.email}</span>
                      </div>
                      {contact.isPrimary && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Primary</span>
                      )}
                      <button onClick={() => setQuotation(prev => ({
                        ...prev,
                        attentionContacts: prev.attentionContacts.filter((_, idx) => idx !== i)
                      }))} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => setShowContactSelector(true)}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Add Contact
                  </button>
                </div>
              </div>

              {/* Job Code Link */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Job Code (Optional)
                </label>
                <input type="text" value={quotation.jobCode}
                  onChange={(e) => setQuotation(prev => ({ ...prev, jobCode: e.target.value }))}
                  placeholder="e.g., FS-P1152"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
              </div>

              {/* Validity & Terms */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Validity (Days)
                  </label>
                  <input type="number" value={quotation.validityDays}
                    onChange={(e) => setQuotation(prev => ({ ...prev, validityDays: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Delivery Terms
                  </label>
                  <select value={quotation.deliveryTerms}
                    onChange={(e) => setQuotation(prev => ({ ...prev, deliveryTerms: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                    <option value="Ex-Works">Ex-Works</option>
                    <option value="FOB">FOB</option>
                    <option value="CIF">CIF</option>
                    <option value="DDP">DDP</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Lines Section */}
          {activeSection === 'lines' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Package className="w-5 h-5" /> Line Items
                  {errors.lines && <span className="text-red-500 text-sm font-normal ml-2">{errors.lines}</span>}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingLineIndex(null); setShowProductSearch(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4" /> Add from Catalog
                  </button>
                  <button onClick={handleAddLine}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Plus className="w-4 h-4" /> Add Manual
                  </button>
                </div>
              </div>

              {lines.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No line items added yet</p>
                  <button onClick={() => setShowProductSearch(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Add Your First Item
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      {/* Line Header */}
                      <div className="p-4 flex items-center justify-between cursor-pointer"
                        onClick={() => toggleLineExpand(index)}>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500 font-mono">{String(index + 1).padStart(2, '0')}</span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {line.partNumber || line.sku || 'New Item'}
                              {line.brand && <span className="text-gray-500 ml-2">({line.brand})</span>}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                              {line.description || 'No description'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(line.lineTotal, quotation.currency)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {line.quantity} × {formatCurrency(line.unitPrice, quotation.currency)}
                            </p>
                          </div>
                          {expandedLines[index] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>

                      {/* Line Details */}
                      {expandedLines[index] && (
                        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                          <QuotationLineForm
                            line={line}
                            index={index}
                            currency={quotation.currency}
                            clientTier={quotation.clientTier}
                            tierPricing={tierPricing}
                            onUpdate={(updates) => handleUpdateLine(index, updates)}
                            onRemove={() => handleRemoveLine(index)}
                            onProductSearch={() => { setEditingLineIndex(index); setShowProductSearch(true); }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pricing Section */}
          {activeSection === 'pricing' && (
            <DiscountCalculator
              quotation={quotation}
              totals={totals}
              onChange={(updates) => setQuotation(prev => ({ ...prev, ...updates }))}
            />
          )}

          {/* Shipping Section */}
          {activeSection === 'shipping' && (
            <ShippingCalculator
              lines={lines}
              quotation={quotation}
              onChange={(updates) => setQuotation(prev => ({ ...prev, ...updates }))}
            />
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" /> PDF Settings
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries({
                  showSKU: 'Show SKU',
                  showClientMaterialCode: 'Show Client Material Code',
                  showLineDiscount: 'Show Line Discounts',
                  showOverallDiscount: 'Show Overall Discount',
                  showDimensions: 'Show Dimensions',
                  showWeight: 'Show Weight',
                  showLeadTime: 'Show Lead Time',
                  showBrandLogo: 'Show Brand Logo'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={quotation.pdfConfig[key]}
                      onChange={(e) => setQuotation(prev => ({
                        ...prev,
                        pdfConfig: { ...prev.pdfConfig, [key]: e.target.checked }
                      }))}
                      className="rounded border-gray-300 dark:border-gray-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PDF Template
                </label>
                <select value={quotation.pdfConfig.template}
                  onChange={(e) => setQuotation(prev => ({
                    ...prev,
                    pdfConfig: { ...prev.pdfConfig, template: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                  <option value="standard">Standard</option>
                  <option value="detailed">Detailed (with specs)</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (Visible to Client)
                </label>
                <textarea value={quotation.notes} rows={3}
                  onChange={(e) => setQuotation(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Internal Notes (Hidden from Client)
                </label>
                <textarea value={quotation.internalNotes} rows={3}
                  onChange={(e) => setQuotation(prev => ({ ...prev, internalNotes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-32 space-y-4">
            {/* Quotation Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Summary</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Lines</span>
                  <span className="font-medium">{lines.length} items</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal, quotation.currency)}</span>
                </div>
                
                {totals.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(totals.discount, quotation.currency)}</span>
                  </div>
                )}
                
                {totals.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax ({quotation.taxRate}%)</span>
                    <span className="font-medium">{formatCurrency(totals.tax, quotation.currency)}</span>
                  </div>
                )}
                
                {totals.shipping > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping</span>
                    <span className="font-medium">{formatCurrency(totals.shipping, quotation.currency)}</span>
                  </div>
                )}
                
                <hr className="border-gray-200 dark:border-gray-700" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total</span>
                  <span>{formatCurrency(totals.grandTotal, quotation.currency)}</span>
                </div>
                
                {quotation.currency !== 'MYR' && (
                  <p className="text-xs text-gray-500 text-right">
                    ≈ {formatCurrency(totals.grandTotal * 4.5, 'MYR')} (est.)
                  </p>
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Info</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <span>{quotation.companyCode} - {quotation.companyName}</span>
                </div>
                {quotation.clientName && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{quotation.clientName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span>{quotation.currency}</span>
                </div>
                {quotation.jobCode && (
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-gray-400" />
                    <span>{quotation.jobCode}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showProductSearch && (
        <ProductSearchModal
          isOpen={showProductSearch}
          onClose={() => { setShowProductSearch(false); setEditingLineIndex(null); }}
          onSelectProduct={handleProductSelect}
          currency={quotation.currency}
          clientTier={quotation.clientTier}
        />
      )}

      {showContactSelector && selectedClient && (
        <ContactSelector
          isOpen={showContactSelector}
          onClose={() => setShowContactSelector(false)}
          clientId={selectedClient.id}
          selectedContacts={quotation.attentionContacts}
          onSelect={(contacts) => {
            setQuotation(prev => ({ ...prev, attentionContacts: contacts }));
            setShowContactSelector(false);
          }}
        />
      )}

      {showDummyGenerator && (
        <DummyQuoteGenerator
          isOpen={showDummyGenerator}
          onClose={() => setShowDummyGenerator(false)}
          currentCompany={quotation.companyCode}
          onGenerate={handleGenerateDummyQuotes}
        />
      )}
    </div>
  );
};

export default QuotationCreate;
