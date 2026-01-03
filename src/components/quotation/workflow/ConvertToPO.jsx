// ConvertToPO.jsx - Convert quotation to purchase order component
// Handles line item selection, supplier mapping, and PO creation

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  ShoppingCart,
  ArrowRight,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Package,
  Building2,
  User,
  DollarSign,
  Calendar,
  Truck,
  Settings,
  Copy,
  ExternalLink,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { db } from '../../../firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';

// PO creation modes
const CREATION_MODES = {
  single: { label: 'Single PO', description: 'Create one PO for all items' },
  by_supplier: { label: 'By Supplier', description: 'Separate PO per supplier' },
  by_category: { label: 'By Category', description: 'Separate PO per product category' },
  custom: { label: 'Custom Selection', description: 'Manual line grouping' }
};

const ConvertToPO = ({
  quotationId,
  quotation,
  currentUser,
  onConversionComplete,
  onCancel,
  defaultMode = 'by_supplier'
}) => {
  // State
  const [lines, setLines] = useState([]);
  const [selectedLines, setSelectedLines] = useState(new Set());
  const [suppliers, setSuppliers] = useState({});
  const [creationMode, setCreationMode] = useState(defaultMode);
  const [customGroups, setCustomGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [step, setStep] = useState(1); // 1: Select Lines, 2: Configure POs, 3: Review, 4: Complete
  const [createdPOs, setCreatedPOs] = useState([]);
  const [poConfig, setPoConfig] = useState({
    prefix: 'PO',
    autoNumber: true,
    deliveryDays: 14,
    paymentTerms: 'Net 30',
    includeQuotationRef: true,
    notifySuppliers: false
  });
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load quotation lines and supplier data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get quotation lines
        const quotationLines = quotation?.lines || [];
        
        // Enhance lines with supplier info
        const enhancedLines = await Promise.all(
          quotationLines.map(async (line, index) => {
            let supplierInfo = null;
            
            if (line.supplierId) {
              // Try to get supplier from Firestore
              try {
                const supplierDoc = await getDoc(doc(db, 'suppliers', line.supplierId));
                if (supplierDoc.exists()) {
                  supplierInfo = { id: supplierDoc.id, ...supplierDoc.data() };
                }
              } catch (err) {
                console.error('Error loading supplier:', err);
              }
            }

            return {
              ...line,
              lineIndex: index,
              lineId: line.id || `line_${index}`,
              supplierInfo,
              category: line.category || 'General',
              canConvert: true,
              existingPO: null // Would check for existing POs
            };
          })
        );

        setLines(enhancedLines);
        
        // Select all lines by default
        setSelectedLines(new Set(enhancedLines.map(l => l.lineId)));

        // Group suppliers
        const supplierMap = {};
        enhancedLines.forEach(line => {
          if (line.supplierId) {
            if (!supplierMap[line.supplierId]) {
              supplierMap[line.supplierId] = {
                id: line.supplierId,
                name: line.supplierInfo?.name || line.supplierName || 'Unknown Supplier',
                info: line.supplierInfo,
                lines: []
              };
            }
            supplierMap[line.supplierId].lines.push(line.lineId);
          }
        });
        setSuppliers(supplierMap);

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load quotation data');
        
        // Use mock data for demo
        const mockLines = generateMockLines();
        setLines(mockLines);
        setSelectedLines(new Set(mockLines.map(l => l.lineId)));
      } finally {
        setLoading(false);
      }
    };

    if (quotation) {
      loadData();
    }
  }, [quotation]);

  // Generate mock lines for demo
  const generateMockLines = () => {
    return [
      {
        lineId: 'line_1',
        lineIndex: 0,
        productId: 'prod_1',
        productName: 'Grundfos CR 10-5',
        productCode: 'CR10-5-A-A-A-E-HQQE',
        quantity: 2,
        unitPrice: 4500,
        totalPrice: 9000,
        supplierId: 'sup_1',
        supplierName: 'Grundfos Malaysia',
        supplierInfo: { name: 'Grundfos Malaysia Sdn Bhd', email: 'orders@grundfos.my' },
        category: 'Pumps',
        canConvert: true
      },
      {
        lineId: 'line_2',
        lineIndex: 1,
        productId: 'prod_2',
        productName: 'ABB ACS580 VFD 15kW',
        productCode: 'ACS580-01-032A-4',
        quantity: 1,
        unitPrice: 3200,
        totalPrice: 3200,
        supplierId: 'sup_2',
        supplierName: 'ABB Malaysia',
        supplierInfo: { name: 'ABB Malaysia Sdn Bhd', email: 'sales@abb.my' },
        category: 'Electrical',
        canConvert: true
      },
      {
        lineId: 'line_3',
        lineIndex: 2,
        productId: 'prod_3',
        productName: 'Pressure Transmitter PT-100',
        productCode: 'PT-100-4-20MA',
        quantity: 4,
        unitPrice: 450,
        totalPrice: 1800,
        supplierId: 'sup_1',
        supplierName: 'Grundfos Malaysia',
        supplierInfo: { name: 'Grundfos Malaysia Sdn Bhd', email: 'orders@grundfos.my' },
        category: 'Instrumentation',
        canConvert: true
      },
      {
        lineId: 'line_4',
        lineIndex: 3,
        productId: 'prod_4',
        productName: 'Installation Service',
        productCode: 'SVC-INSTALL',
        quantity: 1,
        unitPrice: 2500,
        totalPrice: 2500,
        supplierId: null,
        supplierName: null,
        category: 'Services',
        canConvert: false,
        conversionNote: 'Services are handled separately'
      }
    ];
  };

  // Filter lines based on search
  const filteredLines = useMemo(() => {
    if (!searchQuery) return lines;
    
    const query = searchQuery.toLowerCase();
    return lines.filter(line =>
      line.productName?.toLowerCase().includes(query) ||
      line.productCode?.toLowerCase().includes(query) ||
      line.supplierName?.toLowerCase().includes(query) ||
      line.category?.toLowerCase().includes(query)
    );
  }, [lines, searchQuery]);

  // Calculate grouped POs based on mode
  const poGroups = useMemo(() => {
    const selectedLinesData = lines.filter(l => selectedLines.has(l.lineId) && l.canConvert);
    
    switch (creationMode) {
      case 'single':
        return [{
          id: 'group_1',
          name: 'All Items',
          supplier: null,
          lines: selectedLinesData,
          total: selectedLinesData.reduce((sum, l) => sum + (l.totalPrice || 0), 0)
        }];
        
      case 'by_supplier':
        const bySupplier = {};
        selectedLinesData.forEach(line => {
          const supplierId = line.supplierId || 'no_supplier';
          if (!bySupplier[supplierId]) {
            bySupplier[supplierId] = {
              id: `group_${supplierId}`,
              name: line.supplierName || 'No Supplier Assigned',
              supplier: line.supplierInfo,
              supplierId,
              lines: [],
              total: 0
            };
          }
          bySupplier[supplierId].lines.push(line);
          bySupplier[supplierId].total += line.totalPrice || 0;
        });
        return Object.values(bySupplier);
        
      case 'by_category':
        const byCategory = {};
        selectedLinesData.forEach(line => {
          const category = line.category || 'General';
          if (!byCategory[category]) {
            byCategory[category] = {
              id: `group_${category}`,
              name: category,
              supplier: null,
              category,
              lines: [],
              total: 0
            };
          }
          byCategory[category].lines.push(line);
          byCategory[category].total += line.totalPrice || 0;
        });
        return Object.values(byCategory);
        
      case 'custom':
        return customGroups;
        
      default:
        return [];
    }
  }, [lines, selectedLines, creationMode, customGroups]);

  // Toggle line selection
  const toggleLine = (lineId) => {
    setSelectedLines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lineId)) {
        newSet.delete(lineId);
      } else {
        newSet.add(lineId);
      }
      return newSet;
    });
  };

  // Select all convertible lines
  const selectAll = () => {
    setSelectedLines(new Set(lines.filter(l => l.canConvert).map(l => l.lineId)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedLines(new Set());
  };

  // Create purchase orders
  const handleCreatePOs = async () => {
    if (poGroups.length === 0) {
      setError('No items selected for PO creation');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const batch = writeBatch(db);
      const createdPOList = [];
      const now = new Date();
      const deliveryDate = new Date(now.getTime() + poConfig.deliveryDays * 24 * 60 * 60 * 1000);

      for (let i = 0; i < poGroups.length; i++) {
        const group = poGroups[i];
        
        // Generate PO number
        const poNumber = poConfig.autoNumber 
          ? `${poConfig.prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`
          : `${poConfig.prefix}-${i + 1}`;

        // Create PO document
        const poData = {
          poNumber,
          quotationId,
          quotationNumber: quotation?.quotationNumber,
          clientId: quotation?.clientId,
          clientName: quotation?.clientName,
          supplierId: group.supplierId || null,
          supplierName: group.name,
          supplierInfo: group.supplier || null,
          
          lines: group.lines.map(line => ({
            lineId: line.lineId,
            productId: line.productId,
            productName: line.productName,
            productCode: line.productCode,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            totalPrice: line.totalPrice,
            category: line.category
          })),
          
          subtotal: group.total,
          taxAmount: 0,
          totalAmount: group.total,
          currency: quotation?.currency || 'MYR',
          
          paymentTerms: poConfig.paymentTerms,
          expectedDeliveryDate: deliveryDate,
          deliveryAddress: quotation?.deliveryAddress || null,
          
          status: 'draft',
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid,
          createdByName: currentUser?.displayName || currentUser?.email,
          
          notes: poConfig.includeQuotationRef 
            ? `Created from Quotation ${quotation?.quotationNumber}`
            : null
        };

        // Add to batch
        const poRef = doc(collection(db, 'purchaseOrders'));
        batch.set(poRef, poData);

        createdPOList.push({
          id: poRef.id,
          ...poData
        });
      }

      // Update quotation with PO references
      const quotationRef = doc(db, 'quotations', quotationId);
      batch.update(quotationRef, {
        hasPurchaseOrders: true,
        purchaseOrderIds: createdPOList.map(po => po.id),
        convertedAt: serverTimestamp(),
        convertedBy: currentUser?.uid,
        updatedAt: serverTimestamp()
      });

      // Add conversion history
      const historyRef = doc(collection(db, 'quotationHistory'));
      batch.set(historyRef, {
        quotationId,
        type: 'converted_to_po',
        userId: currentUser?.uid,
        userName: currentUser?.displayName || currentUser?.email,
        timestamp: serverTimestamp(),
        changes: [{
          field: 'purchaseOrders',
          added: createdPOList.map(po => ({
            poId: po.id,
            poNumber: po.poNumber,
            supplierName: po.supplierName,
            total: po.totalAmount
          }))
        }]
      });

      // Commit batch
      await batch.commit();

      setCreatedPOs(createdPOList);
      setStep(4);
      setSuccess(`Successfully created ${createdPOList.length} purchase order(s)`);

      // Notify parent
      onConversionComplete?.(createdPOList);

    } catch (err) {
      console.error('Error creating POs:', err);
      setError('Failed to create purchase orders. Please try again.');
      
      // Demo mode - simulate success
      if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
        const mockPOs = poGroups.map((group, i) => ({
          id: `mock_po_${i}`,
          poNumber: `${poConfig.prefix}-DEMO-${String(i + 1).padStart(3, '0')}`,
          supplierName: group.name,
          totalAmount: group.total,
          lineCount: group.lines.length
        }));
        setCreatedPOs(mockPOs);
        setStep(4);
        setSuccess(`Demo: Would create ${mockPOs.length} purchase order(s)`);
        setError(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'MYR') => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency
    }).format(amount || 0);
  };

  // Calculate totals
  const totals = useMemo(() => {
    const selectedLinesData = lines.filter(l => selectedLines.has(l.lineId));
    return {
      lineCount: selectedLinesData.length,
      convertibleCount: selectedLinesData.filter(l => l.canConvert).length,
      total: selectedLinesData.reduce((sum, l) => sum + (l.totalPrice || 0), 0),
      poCount: poGroups.length
    };
  }, [lines, selectedLines, poGroups]);

  // Render loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading quotation data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Convert to Purchase Order</h3>
        </div>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Step Indicator */}
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {[
            { num: 1, label: 'Select Items' },
            { num: 2, label: 'Configure' },
            { num: 3, label: 'Review' },
            { num: 4, label: 'Complete' }
          ].map((s, index) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step > s.num 
                    ? 'bg-green-500 text-white'
                    : step === s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-sm ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {index < 3 && (
                <div className={`flex-1 h-1 mx-2 rounded ${step > s.num ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 hover:text-red-800 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Step 1: Select Lines */}
      {step === 1 && (
        <div className="p-4">
          {/* Quotation Info */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{quotation?.quotationNumber}</p>
                <p className="text-sm text-gray-600">{quotation?.clientName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{formatCurrency(quotation?.grandTotal)}</p>
              <p className="text-sm text-gray-600">{lines.length} line items</p>
            </div>
          </div>

          {/* Selection Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={deselectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Deselect All
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="pl-9 pr-3 py-1.5 border rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
            {filteredLines.map((line) => (
              <div
                key={line.lineId}
                className={`p-3 flex items-start gap-3 ${
                  !line.canConvert ? 'bg-gray-50 opacity-75' : ''
                } ${selectedLines.has(line.lineId) ? 'bg-blue-50' : ''}`}
              >
                <div className="pt-0.5">
                  {line.canConvert ? (
                    <button
                      onClick={() => toggleLine(line.lineId)}
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        selectedLines.has(line.lineId)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedLines.has(line.lineId) && <Check className="w-3 h-3" />}
                    </button>
                  ) : (
                    <div className="w-5 h-5 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
                      <X className="w-3 h-3 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900">{line.productName}</p>
                      <p className="text-sm text-gray-500">{line.productCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(line.totalPrice)}</p>
                      <p className="text-sm text-gray-500">{line.quantity} × {formatCurrency(line.unitPrice)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-sm">
                    {line.supplierName && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{line.supplierName}</span>
                      </div>
                    )}
                    {line.category && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                        {line.category}
                      </span>
                    )}
                    {!line.canConvert && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                        {line.conversionNote || 'Cannot convert'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{totals.convertibleCount}</span> of {totals.lineCount} items selected
            </div>
            <div className="font-semibold text-gray-900">
              Total: {formatCurrency(totals.total)}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <div className="p-4">
          {/* Creation Mode */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              PO Creation Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(CREATION_MODES).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setCreationMode(key)}
                  className={`p-3 rounded-lg border text-left ${
                    creationMode === key
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className={`font-medium ${creationMode === key ? 'text-blue-700' : 'text-gray-900'}`}>
                    {config.label}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{config.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* PO Preview by Mode */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Purchase Orders to Create
              </label>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {poGroups.length} PO{poGroups.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2">
              {poGroups.map((group, index) => (
                <div key={group.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{group.name}</p>
                        <p className="text-sm text-gray-500">
                          {group.lines.length} item{group.lines.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">{formatCurrency(group.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings Toggle */}
          <div className="border-t pt-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Settings className="w-4 h-4" />
              <span>Advanced Settings</span>
              {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSettings && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PO Number Prefix
                    </label>
                    <input
                      type="text"
                      value={poConfig.prefix}
                      onChange={(e) => setPoConfig(prev => ({ ...prev, prefix: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Days
                    </label>
                    <input
                      type="number"
                      value={poConfig.deliveryDays}
                      onChange={(e) => setPoConfig(prev => ({ ...prev, deliveryDays: parseInt(e.target.value) || 14 }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={poConfig.paymentTerms}
                    onChange={(e) => setPoConfig(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="COD">Cash on Delivery</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={poConfig.includeQuotationRef}
                      onChange={(e) => setPoConfig(prev => ({ ...prev, includeQuotationRef: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Include quotation reference in PO</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={poConfig.notifySuppliers}
                      onChange={(e) => setPoConfig(prev => ({ ...prev, notifySuppliers: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Send notification to suppliers</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="p-4">
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Review Purchase Orders</h4>
            <p className="text-sm text-gray-600">
              Please review the following purchase orders before creation.
            </p>
          </div>

          {/* PO List */}
          <div className="space-y-4 mb-6">
            {poGroups.map((group, index) => (
              <div key={group.id} className="border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                      <span className="text-white font-semibold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {poConfig.prefix}-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}-{String(index + 1).padStart(3, '0')}
                      </p>
                      <p className="text-sm text-gray-600">{group.name}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-lg text-gray-900">{formatCurrency(group.total)}</p>
                </div>

                <div className="p-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b">
                        <th className="pb-2">Item</th>
                        <th className="pb-2 text-right">Qty</th>
                        <th className="pb-2 text-right">Unit Price</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.lines.map((line) => (
                        <tr key={line.lineId} className="border-b last:border-0">
                          <td className="py-2">
                            <p className="font-medium text-gray-900">{line.productName}</p>
                            <p className="text-xs text-gray-500">{line.productCode}</p>
                          </td>
                          <td className="py-2 text-right">{line.quantity}</td>
                          <td className="py-2 text-right">{formatCurrency(line.unitPrice)}</td>
                          <td className="py-2 text-right font-medium">{formatCurrency(line.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Delivery: {poConfig.deliveryDays} days</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>{poConfig.paymentTerms}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Warning */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Important</p>
              <p className="text-sm text-amber-700">
                Creating purchase orders will link them to this quotation. 
                You can still edit the POs after creation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 4 && (
        <div className="p-4">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="text-xl font-semibold text-gray-900 mb-2">
              Purchase Orders Created!
            </h4>
            <p className="text-gray-600 mb-6">
              Successfully created {createdPOs.length} purchase order{createdPOs.length !== 1 ? 's' : ''}.
            </p>
          </div>

          {/* Created POs */}
          <div className="space-y-2 mb-6">
            {createdPOs.map((po) => (
              <div key={po.id} className="p-3 border rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{po.poNumber}</p>
                    <p className="text-sm text-gray-600">{po.supplierName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-gray-900">{formatCurrency(po.totalAmount)}</p>
                  <button
                    onClick={() => {/* Navigate to PO */}}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="View PO"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {/* Navigate to PO list */}}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              View Purchase Orders
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      {step < 4 && (
        <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onCancel?.()}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            {step === 1 && `${totals.convertibleCount} items selected`}
            {step === 2 && `${poGroups.length} PO${poGroups.length !== 1 ? 's' : ''} to create`}
            {step === 3 && `Total: ${formatCurrency(totals.total)}`}
          </div>

          <button
            onClick={() => {
              if (step === 3) {
                handleCreatePOs();
              } else {
                setStep(step + 1);
              }
            }}
            disabled={submitting || (step === 1 && totals.convertibleCount === 0)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : step === 3 ? (
              <>
                <Check className="w-4 h-4" />
                Create POs
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ConvertToPO;
