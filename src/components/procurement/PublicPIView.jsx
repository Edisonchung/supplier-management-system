// src/components/procurement/PublicPIView.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, DollarSign, Package, Building2, 
  CreditCard, Upload, CheckCircle, Clock, MessageSquare,
  Download, Eye, Truck, Tag, Briefcase
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { mockFirebase } from '../../services/firebase';

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
      // Find PI by shareable ID
      const piSnapshot = await mockFirebase.firestore.collection('proformaInvoices')
        .where('shareableId', '==', shareableId).get();
      
      if (!piSnapshot.empty) {
        const piData = { id: piSnapshot.docs[0].id, ...piSnapshot.docs[0].data() };
        setPI(piData);
        
        // Load supplier data
        if (piData.supplierId) {
          const supplierDoc = await mockFirebase.firestore.collection('suppliers')
            .doc(piData.supplierId).get();
          if (supplierDoc.exists) {
            setSupplier({ id: supplierDoc.id, ...supplierDoc.data() });
          }
        }
      }
    } catch (error) {
      console.error('Error loading PI:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, this would upload to a server
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

      // Update PI with new payment
      const updatedPayments = [...(pi.payments || []), payment];
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      const paymentStatus = totalPaid >= pi.totalAmount ? 'paid' : 'partial';

      await mockFirebase.firestore.collection('proformaInvoices').doc(pi.id).update({
        payments: updatedPayments,
        totalPaid,
        paymentStatus,
        updatedAt: new Date().toISOString()
      });

      alert('Payment submitted successfully! The supplier will be notified.');
      
      // Reset form
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
      
      // Reload PI data
      await loadPIData();
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to submit payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Proforma Invoice Not Found</h2>
          <p className="text-gray-600">The invoice you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const totalAmount = pi.totalAmount || 0;
  const totalPaid = pi.totalPaid || 0;
  const paymentProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Proforma Invoice</h1>
              <p className="text-gray-600">{pi.piNumber}</p>
              {pi.projectCode && (
                <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                  <Briefcase size={14} />
                  Project: {pi.projectCode}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* PI Details Card */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Invoice Details</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Supplier</p>
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-gray-400" />
                  <p className="font-medium">{supplier?.name || 'Unknown'}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">Date</p>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="font-medium">{new Date(pi.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Purpose</p>
                <div className="flex items-center gap-2">
                  <Tag size={16} className="text-gray-400" />
                  <p className="font-medium capitalize">{pi.purpose?.replace('-', ' ')}</p>
                </div>
              </div>

              {pi.projectCode && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Project Code</p>
                  <div className="flex items-center gap-2">
                    <Briefcase size={16} className="text-gray-400" />
                    <p className="font-medium text-blue-600">{pi.projectCode}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600 mb-1">Payment Terms</p>
                <p className="font-medium">{pi.paymentTerms || '30% down payment, 70% before delivery'}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="mt-6">
              <h3 className="font-medium mb-3">Items</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pi.items?.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-gray-600">{item.productCode}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2">${item.unitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2 font-medium">${item.totalPrice.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-right font-medium">Total:</td>
                      <td className="px-4 py-2 font-bold">${totalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status Card */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Payment Status</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount Paid</p>
                <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Balance Due</p>
                <p className="text-2xl font-bold text-red-600">${(totalAmount - totalPaid).toFixed(2)}</p>
              </div>
            </div>

            {/* Payment Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>Payment Progress</span>
                <span className={`px-2 py-1 rounded-full text-xs ${getPaymentStatusColor(pi.paymentStatus || 'pending')}`}>
                  {pi.paymentStatus || 'pending'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    paymentProgress >= 100 ? 'bg-green-600' : 'bg-yellow-600'
                  }`}
                  style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                />
              </div>
            </div>

            {/* Payment History */}
            {pi.payments && pi.payments.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium mb-3">Payment History</h3>
                <div className="space-y-2">
                  {pi.payments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">${payment.amount.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">
                          {payment.type} • {payment.method} • {new Date(payment.date).toLocaleDateString()}
                        </p>
                        {payment.reference && (
                          <p className="text-xs text-gray-500">Ref: {payment.reference}</p>
                        )}
                      </div>
                      {payment.attachments && payment.attachments.length > 0 && (
                        <Eye size={16} className="text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Payment Button */}
            {pi.paymentStatus !== 'paid' && (
              <button
                onClick={() => setShowPaymentForm(true)}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                Submit Payment
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Submit Payment</h3>
            </div>
            
            <div className="p-6">
              {/* Contact Information */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={paymentData.payerName}
                      onChange={(e) => setPaymentData({ ...paymentData, payerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={paymentData.payerEmail}
                      onChange={(e) => setPaymentData({ ...paymentData, payerEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={paymentData.payerPhone}
                      onChange={(e) => setPaymentData({ ...paymentData, payerPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Payment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentData.amount}
                      onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentData.date}
                      onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Type
                    </label>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentData.method}
                      onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="bank-transfer">Bank Transfer</option>
                      <option value="check">Check</option>
                      <option value="cash">Cash</option>
                      <option value="credit-card">Credit Card</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={paymentData.reference}
                      onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Transaction ID or check number"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Payment Proof
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                            <span>Upload a file</span>
                            <input 
                              id="file-upload" 
                              name="file-upload" 
                              type="file" 
                              className="sr-only"
                              accept="image/*,.pdf"
                              onChange={handleFileUpload}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Remarks
                    </label>
                    <textarea
                      value={paymentData.remark}
                      onChange={(e) => setPaymentData({ ...paymentData, remark: e.target.value })}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex gap-3">
              <button
                onClick={() => setShowPaymentForm(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Submit Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPIView;
