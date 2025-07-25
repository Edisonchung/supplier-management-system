// src/components/procurement/PublicPIView.jsx - FIXED for Firestore
import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, DollarSign, Package, Building2, 
  CreditCard, Upload, CheckCircle, Clock, MessageSquare,
  Download, Eye, Truck, Tag, Briefcase, AlertTriangle
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const PublicPIView = () => {
  const { shareableId } = useParams();
  const [pi, setPI] = useState(null);
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'down-payment',
    method: 'bank-transfer',
    reference: '',
    remark: '',
    payerName: '',
    payerEmail: '',
    payerPhone: '',
    attachments: []
  });

  useEffect(() => {
    loadPIData();
  }, [shareableId]);

  const loadPIData = async () => {
    try {
      console.log('🔍 Loading PI data for shareableId:', shareableId);
      
      // Find PI by shareable ID using Firestore query
      const piQuery = query(
        collection(db, 'proformaInvoices'), 
        where('shareableId', '==', shareableId)
      );
      const piSnapshot = await getDocs(piQuery);
      
      if (!piSnapshot.empty) {
        const piDoc = piSnapshot.docs[0];
        const piData = { id: piDoc.id, ...piDoc.data() };
        console.log('✅ Found PI:', piData);
        setPI(piData);
        
        // Load supplier data if available
        if (piData.supplierId) {
          const supplierRef = doc(db, 'suppliers', piData.supplierId);
          const supplierDoc = await getDoc(supplierRef);
          
          if (supplierDoc.exists()) {
            const supplierData = { id: supplierDoc.id, ...supplierDoc.data() };
            console.log('✅ Found supplier:', supplierData);
            setSupplier(supplierData);
          }
        }
      } else {
        console.log('❌ No PI found with shareableId:', shareableId);
      }
    } catch (error) {
      console.error('❌ Error loading PI:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, this would upload to Firebase Storage
      const fakeUrl = URL.createObjectURL(file);
      setPaymentData(prev => ({
        ...prev,
        attachments: [...prev.attachments, {
          name: file.name,
          url: fakeUrl,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        }]
      }));
    }
  };

  const handleSubmitPayment = async () => {
    if (!paymentData.amount || !paymentData.payerName || !paymentData.payerEmail) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const payment = {
        ...paymentData,
        amount: parseFloat(paymentData.amount),
        createdAt: new Date().toISOString(),
        id: `payment-${Date.now()}`
      };

      // Update PI with new payment using Firestore
      const updatedPayments = [...(pi.payments || []), payment];
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const paymentStatus = totalPaid >= pi.totalAmount ? 'paid' : 'partial';

      const piRef = doc(db, 'proformaInvoices', pi.id);
      await updateDoc(piRef, {
        payments: updatedPayments,
        paymentStatus: paymentStatus,
        lastPaymentDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setPI(prev => ({
        ...prev,
        payments: updatedPayments,
        paymentStatus: paymentStatus
      }));

      // Reset form and close
      setPaymentData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'down-payment',
        method: 'bank-transfer',
        reference: '',
        remark: '',
        payerName: '',
        payerEmail: '',
        payerPhone: '',
        attachments: []
      });
      setShowPaymentForm(false);

      alert('Payment submitted successfully!');
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Error submitting payment. Please try again.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'paid': return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'delivered': return <Truck className="w-4 h-4 text-purple-500" />;
      case 'cancelled': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateTotalPaid = () => {
    if (!pi?.payments) return 0;
    return pi.payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const calculateRemainingBalance = () => {
    return (pi?.totalAmount || 0) - calculateTotalPaid();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proforma Invoice Not Found</h1>
          <p className="text-gray-600">The requested proforma invoice could not be found or may have been removed.</p>
        </div>
      </div>
    );
  }

  const totalPaid = calculateTotalPaid();
  const remainingBalance = calculateRemainingBalance();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Proforma Invoice</h1>
                <p className="text-sm text-gray-500">{pi.piNumber}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(pi.status)}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pi.status)}`}>
                {pi.status?.charAt(0).toUpperCase() + pi.status?.slice(1) || 'Draft'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Building2 className="w-5 h-5 text-gray-500 mr-2" />
                Invoice Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Invoice Number</label>
                  <p className="text-lg font-semibold text-gray-900">{pi.piNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Issue Date</label>
                  <p className="text-lg text-gray-900">{formatDate(pi.date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Valid Until</label>
                  <p className="text-lg text-gray-900">{formatDate(pi.validUntil)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Payment Terms</label>
                  <p className="text-lg text-gray-900">{pi.paymentTerms || 'Standard Terms'}</p>
                </div>
              </div>
            </div>

            {/* Supplier Information */}
            {supplier && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Briefcase className="w-5 h-5 text-gray-500 mr-2" />
                  Supplier Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Company Name</label>
                    <p className="text-lg font-semibold text-gray-900">{supplier.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Contact Person</label>
                    <p className="text-lg text-gray-900">{supplier.contactPerson || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-lg text-gray-900">{supplier.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-lg text-gray-900">{supplier.phone || 'N/A'}</p>
                  </div>
                </div>
                {supplier.address && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-500">Address</label>
                    <p className="text-lg text-gray-900">{supplier.address}</p>
                  </div>
                )}
              </div>
            )}

            {/* Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 text-gray-500 mr-2" />
                Items ({pi.items?.length || 0})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-medium text-gray-500">Description</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Qty</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Unit Price</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pi.items?.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-gray-900">{item.description || item.productName}</p>
                            {item.specifications && (
                              <p className="text-sm text-gray-500">{item.specifications}</p>
                            )}
                          </div>
                        </td>
                        <td className="text-right py-3 px-2 text-gray-900">{item.quantity}</td>
                        <td className="text-right py-3 px-2 text-gray-900">
                          {formatCurrency(item.unitPrice, pi.currency)}
                        </td>
                        <td className="text-right py-3 px-2 font-medium text-gray-900">
                          {formatCurrency(item.totalPrice || (item.quantity * item.unitPrice), pi.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes */}
            {pi.notes && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 text-gray-500 mr-2" />
                  Additional Notes
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{pi.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 text-gray-500 mr-2" />
                Financial Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(pi.subtotal, pi.currency)}</span>
                </div>
                {pi.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium text-green-600">
                      -{formatCurrency(pi.discount, pi.currency)}
                    </span>
                  </div>
                )}
                {pi.shipping > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">{formatCurrency(pi.shipping, pi.currency)}</span>
                  </div>
                )}
                {pi.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{formatCurrency(pi.tax, pi.currency)}</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(pi.totalAmount, pi.currency)}
                    </span>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Paid</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(totalPaid, pi.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Remaining Balance</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(remainingBalance, pi.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Actions */}
            {remainingBalance > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 text-gray-500 mr-2" />
                  Make Payment
                </h2>
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  Submit Payment
                </button>
              </div>
            )}

            {/* Payment History */}
            {pi.payments && pi.payments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
                <div className="space-y-3">
                  {pi.payments.map((payment, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatCurrency(payment.amount, pi.currency)}
                          </p>
                          <p className="text-sm text-gray-500">{payment.type} • {payment.method}</p>
                          <p className="text-sm text-gray-500">{formatDate(payment.date)}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Received
                        </span>
                      </div>
                      {payment.reference && (
                        <p className="text-sm text-gray-600 mt-2">Ref: {payment.reference}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Submit Payment</h2>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Payment Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount ({pi.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Max: ${formatCurrency(remainingBalance, pi.currency)}`}
                  />
                </div>

                {/* Payment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                  <select
                    value={paymentData.type}
                    onChange={(e) => setPaymentData({ ...paymentData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="down-payment">Down Payment</option>
                    <option value="balance">Balance Payment</option>
                    <option value="partial">Partial Payment</option>
                    <option value="full">Full Payment</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    value={paymentData.method}
                    onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank-transfer">Bank Transfer</option>
                    <option value="credit-card">Credit Card</option>
                    <option value="check">Check</option>
                    <option value="cash">Cash</option>
                    <option value="wire-transfer">Wire Transfer</option>
                  </select>
                </div>

                {/* Payer Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payer Name *</label>
                    <input
                      type="text"
                      value={paymentData.payerName}
                      onChange={(e) => setPaymentData({ ...paymentData, payerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={paymentData.payerEmail}
                      onChange={(e) => setPaymentData({ ...paymentData, payerEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Transaction ID, Check Number, etc."
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Proof (Optional)
                  </label>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={paymentData.remark}
                    onChange={(e) => setPaymentData({ ...paymentData, remark: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional payment notes..."
                  />
                </div>

                {/* Attachments Display */}
                {paymentData.attachments.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Uploaded Files</label>
                    <div className="space-y-2">
                      {paymentData.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <button
                            onClick={() => setPaymentData(prev => ({
                              ...prev,
                              attachments: prev.attachments.filter((_, i) => i !== index)
                            }))}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPayment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Submit Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPIView;
