/**
 * QuotationDetail.jsx
 * Detailed view of a quotation with lines, pricing, cross-references, and actions
 * Part of HiggsFlow Quotation System
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Download,
  Send,
  Copy,
  Building2,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Package,
  DollarSign,
  Percent,
  Truck,
  MapPin,
  Phone,
  Mail,
  Globe,
  Briefcase,
  Link2,
  ExternalLink,
  MoreVertical,
  Printer,
  History,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Tag,
  Hash,
  Layers,
  Receipt,
  CreditCard
} from 'lucide-react';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

// Status configuration
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 border-gray-300', icon: FileText },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: CheckCircle },
  sent: { label: 'Sent', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: Send },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: AlertCircle },
  converted: { label: 'Converted', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-300', icon: XCircle }
};

// Client tier labels
const TIER_LABELS = {
  end_user: 'End User',
  contractor: 'Contractor',
  trader: 'Trader',
  si: 'System Integrator',
  partner: 'Partner',
  dealer: 'Dealer'
};

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [quotation, setQuotation] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedLines, setExpandedLines] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [activeAction, setActiveAction] = useState(null);

  // Fetch quotation and lines
  const fetchQuotation = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch quotation
      const quotationRef = doc(db, 'quotations', id);
      const quotationSnap = await getDoc(quotationRef);
      
      if (!quotationSnap.exists()) {
        setError('Quotation not found');
        return;
      }
      
      const quotationData = {
        id: quotationSnap.id,
        ...quotationSnap.data(),
        createdAt: quotationSnap.data().createdAt?.toDate?.() || new Date(),
        updatedAt: quotationSnap.data().updatedAt?.toDate?.() || new Date(),
        validUntil: quotationSnap.data().validUntil?.toDate?.() || null,
        sentAt: quotationSnap.data().sentAt?.toDate?.() || null
      };
      
      setQuotation(quotationData);
      
      // Fetch lines
      const linesQuery = query(
        collection(db, 'quotationLines'),
        where('quotationId', '==', id),
        orderBy('lineNumber', 'asc')
      );
      const linesSnap = await getDocs(linesQuery);
      const linesData = linesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLines(linesData);
      
    } catch (err) {
      console.error('Error fetching quotation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  // Format currency
  const formatCurrency = (amount, currency = 'MYR') => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (date, includeTime = false) => {
    if (!date) return '-';
    const options = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' })
    };
    return new Date(date).toLocaleDateString('en-MY', options);
  };

  // Toggle line expansion
  const toggleLineExpansion = (lineId) => {
    setExpandedLines(prev => ({
      ...prev,
      [lineId]: !prev[lineId]
    }));
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  // Render price source badge
  const renderPriceSourceBadge = (source) => {
    const configs = {
      list_price_book: { label: 'List Price', color: 'bg-blue-50 text-blue-700' },
      nett_price: { label: 'Nett Price', color: 'bg-green-50 text-green-700' },
      market_estimate: { label: 'AI Estimate', color: 'bg-purple-50 text-purple-700' },
      manual: { label: 'Manual', color: 'bg-gray-50 text-gray-700' }
    };
    const config = configs[source] || configs.manual;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Render description source badge
  const renderDescriptionSourceBadge = (source) => {
    const configs = {
      standard: { label: 'Catalog', color: 'bg-gray-50 text-gray-700' },
      ai_generated: { label: 'AI Generated', color: 'bg-purple-50 text-purple-700' },
      custom: { label: 'Custom', color: 'bg-blue-50 text-blue-700' }
    };
    const config = configs[source] || configs.standard;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-8"></div>
          <div className="grid grid-cols-3 gap-6">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-red-900 mb-2">Error Loading Quotation</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => navigate('/quotations')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  if (!quotation) return null;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{quotation.quotationNumber}</h1>
              {quotation.isDummyQuote && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                  Dummy Quote
                </span>
              )}
            </div>
            <p className="text-gray-500">
              Created {formatDate(quotation.createdAt, true)} by {quotation.createdBy?.name || 'Unknown'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {renderStatusBadge(quotation.status)}
          
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => navigate(`/quotations/${id}/edit`)}
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => window.open(`/api/quotations/${id}/pdf`, '_blank')}
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            {quotation.status === 'approved' && (
              <button
                onClick={() => setActiveAction('send')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
                Send to Client
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company & Client Info */}
          <div className="grid grid-cols-2 gap-6">
            {/* Company */}
            <div className="bg-white rounded-lg border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Issuing Company</h3>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-medium">{quotation.company?.name || quotation.company?.id}</div>
                <div className="text-sm text-gray-600">{quotation.company?.registrationNumber}</div>
                <div className="text-sm text-gray-600">{quotation.company?.address}</div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  {quotation.company?.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {quotation.company?.email}
                </div>
              </div>
            </div>

            {/* Client */}
            <div className="bg-white rounded-lg border p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">Client</h3>
                </div>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                  {TIER_LABELS[quotation.client?.tier] || quotation.client?.tier}
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-medium">{quotation.client?.name}</div>
                <div className="text-sm text-gray-500 font-mono">{quotation.client?.code}</div>
                <div className="text-sm text-gray-600">{quotation.billingAddress?.address}</div>
                
                {/* Attention Contacts */}
                {quotation.attentionContacts?.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs text-gray-500 uppercase mb-2">Attention To</div>
                    {quotation.attentionContacts.map((contact, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="font-medium">{contact.name}</div>
                        <div className="text-gray-600">{contact.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Address (if different) */}
          {quotation.deliveryAddress && quotation.deliveryAddress.address !== quotation.billingAddress?.address && (
            <div className="bg-white rounded-lg border p-5">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Delivery Address</h3>
              </div>
              <div className="text-sm text-gray-600">{quotation.deliveryAddress.address}</div>
            </div>
          )}

          {/* Quotation Lines */}
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="p-5 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">Line Items</h3>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {lines.length} items
                  </span>
                </div>
              </div>
            </div>

            <div className="divide-y">
              {lines.map((line, index) => (
                <div key={line.id} className="p-5">
                  {/* Line Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-500">#{line.lineNumber}</span>
                        {line.product?.sku && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                            {line.product.sku}
                          </span>
                        )}
                        {line.product?.brand && (
                          <span className="text-sm text-gray-500">{line.product.brand}</span>
                        )}
                        {renderPriceSourceBadge(line.pricing?.source)}
                        {renderDescriptionSourceBadge(line.description?.source)}
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-1">
                        {line.product?.partNumber || line.product?.name || 'Unnamed Item'}
                      </h4>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {line.description?.displayText || line.description?.standardText || '-'}
                      </p>
                      
                      {/* Client Material Code */}
                      {line.clientMaterialCode && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Hash className="w-4 h-4" />
                          Client Code: <span className="font-mono">{line.clientMaterialCode}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Line Pricing */}
                    <div className="text-right ml-6">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(line.pricing?.lineTotal, quotation.currency)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {line.quantity} × {formatCurrency(line.pricing?.unitPrice, quotation.currency)}
                      </div>
                      {line.pricing?.lineDiscount > 0 && (
                        <div className="text-sm text-green-600">
                          -{line.pricing.lineDiscount}% discount
                        </div>
                      )}
                    </div>
                    
                    {/* Expand Button */}
                    <button
                      onClick={() => toggleLineExpansion(line.id)}
                      className="ml-4 p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedLines[line.id] ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  
                  {/* Expanded Details */}
                  {expandedLines[line.id] && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-4 text-sm">
                      {/* Cost Information (admin only) */}
                      <div>
                        <div className="text-gray-500 mb-1">Cost Price</div>
                        <div className="font-medium">
                          {formatCurrency(line.pricing?.costPrice, quotation.currency)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Tier Markup</div>
                        <div className="font-medium">{line.pricing?.tierMarkup || 0}%</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Margin</div>
                        <div className="font-medium text-green-600">
                          {line.pricing?.marginPercent?.toFixed(1) || 0}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Margin Amount</div>
                        <div className="font-medium text-green-600">
                          {formatCurrency(line.pricing?.marginAmount, quotation.currency)}
                        </div>
                      </div>
                      
                      {/* Dimensions & Weight */}
                      {(line.dimensions || line.weight) && (
                        <>
                          {line.dimensions && (
                            <div>
                              <div className="text-gray-500 mb-1">Dimensions (LxWxH)</div>
                              <div className="font-medium">
                                {line.dimensions.length} × {line.dimensions.width} × {line.dimensions.height} {line.dimensions.unit || 'cm'}
                              </div>
                            </div>
                          )}
                          {line.weight && (
                            <div>
                              <div className="text-gray-500 mb-1">Weight</div>
                              <div className="font-medium">
                                {line.weight.actual} {line.weight.unit || 'kg'}
                                {line.weight.chargeable && line.weight.chargeable !== line.weight.actual && (
                                  <span className="text-gray-500 ml-1">
                                    (Chargeable: {line.weight.chargeable} {line.weight.unit || 'kg'})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Lead Time & Stock */}
                      {line.leadTime && (
                        <div>
                          <div className="text-gray-500 mb-1">Lead Time</div>
                          <div className="font-medium">{line.leadTime}</div>
                        </div>
                      )}
                      {line.stockStatus && (
                        <div>
                          <div className="text-gray-500 mb-1">Stock Status</div>
                          <div className={`font-medium ${line.stockStatus === 'in_stock' ? 'text-green-600' : 'text-orange-600'}`}>
                            {line.stockStatus === 'in_stock' ? 'In Stock' : 'To Order'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Terms & Notes */}
          {(quotation.termsAndConditions || quotation.notes || quotation.internalNotes) && (
            <div className="bg-white rounded-lg border p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Terms & Notes</h3>
              
              {quotation.termsAndConditions && (
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-1">Terms & Conditions</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {quotation.termsAndConditions}
                  </div>
                </div>
              )}
              
              {quotation.notes && (
                <div className="mb-4">
                  <div className="text-sm text-gray-500 mb-1">Notes to Client</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {quotation.notes}
                  </div>
                </div>
              )}
              
              {quotation.internalNotes && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="text-sm text-yellow-700 font-medium mb-1">Internal Notes</div>
                  <div className="text-sm text-yellow-800 whitespace-pre-wrap">
                    {quotation.internalNotes}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History */}
          {quotation.history?.length > 0 && (
            <div className="bg-white rounded-lg border">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full p-5 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">History</h3>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {quotation.history.length} events
                  </span>
                </div>
                {showHistory ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {showHistory && (
                <div className="border-t divide-y">
                  {quotation.history.slice().reverse().map((event, index) => (
                    <div key={index} className="p-4 flex items-start gap-4">
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{event.action}</div>
                        <div className="text-sm text-gray-500">
                          {event.byName || event.by} • {formatDate(event.at?.toDate?.() || event.at, true)}
                        </div>
                        {event.details && (
                          <div className="text-sm text-gray-600 mt-1">{event.details}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column - Summary & Cross-References */}
        <div className="space-y-6">
          {/* Totals Summary */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(quotation.totals?.subtotal, quotation.currency)}
                </span>
              </div>
              
              {quotation.totals?.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>
                    Discount
                    {quotation.discount?.type === 'percentage' && ` (${quotation.discount.value}%)`}
                  </span>
                  <span>-{formatCurrency(quotation.totals.discountAmount, quotation.currency)}</span>
                </div>
              )}
              
              {quotation.totals?.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">
                    Tax ({quotation.taxRate || 0}%)
                  </span>
                  <span className="font-medium">
                    {formatCurrency(quotation.totals.taxAmount, quotation.currency)}
                  </span>
                </div>
              )}
              
              {quotation.totals?.shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-medium">
                    {formatCurrency(quotation.totals.shippingCost, quotation.currency)}
                  </span>
                </div>
              )}
              
              <hr />
              
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Grand Total</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(quotation.totals?.grandTotal, quotation.currency)}
                </span>
              </div>
              
              {quotation.currency !== 'MYR' && (
                <div className="text-xs text-gray-500 text-right">
                  ≈ {formatCurrency(quotation.totals?.grandTotalMYR, 'MYR')}
                </div>
              )}
            </div>
          </div>

          {/* Key Dates */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Key Dates</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>{formatDate(quotation.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Valid Until</span>
                <span className={quotation.validUntil && new Date(quotation.validUntil) < new Date() ? 'text-red-600' : ''}>
                  {formatDate(quotation.validUntil)}
                </span>
              </div>
              {quotation.sentAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Sent</span>
                  <span>{formatDate(quotation.sentAt)}</span>
                </div>
              )}
              {quotation.paymentTerms && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Terms</span>
                  <span>{quotation.paymentTerms}</span>
                </div>
              )}
              {quotation.deliveryTerms && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Terms</span>
                  <span>{quotation.deliveryTerms}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cross References */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Cross References</h3>
            
            <div className="space-y-4">
              {/* Job Code */}
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Briefcase className="w-4 h-4" />
                  Job Code
                </div>
                {quotation.jobCode ? (
                  <Link
                    to={`/job-codes/${quotation.jobCodeId}`}
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-mono text-sm"
                  >
                    {quotation.jobCode}
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="text-gray-400 text-sm">Not linked</span>
                )}
              </div>
              
              {/* Related PIs */}
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Receipt className="w-4 h-4" />
                  Related PIs
                </div>
                {quotation.relatedPIs?.length > 0 ? (
                  <div className="space-y-1">
                    {quotation.relatedPIs.map((pi, idx) => (
                      <Link
                        key={idx}
                        to={`/pi/${pi.id || pi.piNumber}`}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {pi.piNumber}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">None</span>
                )}
              </div>
              
              {/* Related POs */}
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <CreditCard className="w-4 h-4" />
                  Related POs
                </div>
                {quotation.relatedPOs?.length > 0 ? (
                  <div className="space-y-1">
                    {quotation.relatedPOs.map((po, idx) => (
                      <Link
                        key={idx}
                        to={`/po/${po.id || po.poNumber}`}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {po.poNumber}
                        {po.isClientPO && (
                          <span className="px-1 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                            Client
                          </span>
                        )}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">None</span>
                )}
              </div>
              
              {/* Dummy Quotes */}
              {(quotation.isDummyQuote || quotation.dummyQuotes?.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Layers className="w-4 h-4" />
                    {quotation.isDummyQuote ? 'Master Quote' : 'Dummy Quotes'}
                  </div>
                  {quotation.isDummyQuote ? (
                    <Link
                      to={`/quotations/${quotation.masterQuoteId}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Master Quote
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : quotation.dummyQuotes?.length > 0 ? (
                    <div className="space-y-1">
                      {quotation.dummyQuotes.map((dq, idx) => (
                        <Link
                          key={idx}
                          to={`/quotations/${dq.quotationId}`}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {dq.quotationNumber} ({dq.companyId})
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            
            <div className="space-y-2">
              <button
                onClick={() => navigate(`/quotations/create`, { state: { duplicateFrom: quotation } })}
                className="w-full flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
              >
                <Copy className="w-4 h-4" />
                Duplicate Quote
              </button>
              
              {!quotation.isDummyQuote && (
                <button
                  onClick={() => navigate(`/quotations/${id}/dummy-quotes`)}
                  className="w-full flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Building2 className="w-4 h-4" />
                  Create Dummy Quotes
                </button>
              )}
              
              {!quotation.jobCodeId && (
                <button
                  onClick={() => setActiveAction('linkJobCode')}
                  className="w-full flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
                >
                  <Briefcase className="w-4 h-4" />
                  Link to Job Code
                </button>
              )}
              
              {quotation.status === 'accepted' && (
                <button
                  onClick={() => navigate(`/quotations/${id}/convert`)}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Convert to PO
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationDetail;
