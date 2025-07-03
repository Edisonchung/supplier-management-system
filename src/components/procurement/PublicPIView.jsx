// src/components/procurement/PublicPIView.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, DollarSign, Package, Building2, 
  CreditCard, Upload, CheckCircle, Clock, MessageSquare,
  Download, Eye, Truck, Tag
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

      // Send notification (in real app, this would send email/SMS)
      console.log('Payment notification sent');

      alert('Payment submitted successfully! The supplier will be notified.');
      setShowPaymentForm(false);
      loadPIData(); // Reload to show updated payment status
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to submit payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!pi) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">PI Not Found</h2>
          <p className="mt-2 text-gray-600">This PI link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const totalAmount = pi.totalAmount || 0;
  const totalPaid = pi.totalPaid || 0;
  const balance = totalAmount - totalPaid;
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
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Balance</p>
                <p className="text-2xl font-bold text-orange-600">${balance.toFixed(2)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Payment Progress</span>
                <span>{paymentProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                />
              </div>
            </div>

            {/* Payment History */}
            {pi.payments && pi.payments.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium mb-3">Payment History</h3>
                <div className="space-y-3">
                  {pi.payments.map((payment, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">${payment.amount.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(payment.date).toLocaleDateString()} • {payment.type.replace('-', ' ')}
                          </p>
                          {payment.reference && (
                            <p className="text-sm text-gray-600 mt-1">Ref: {payment.reference}</p>
                          )}
                        </div>
                        {payment.attachments && payment.attachments.length > 0 && (
                          <Download className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Make Payment Button */}
            {pi.paymentStatus !== 'paid' && (
              <button
                onClick={() => setShowPaymentForm(true)}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                Make Payment
              </button>
            )}

            {pi.paymentStatus === 'paid' && (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
                <p className="font-medium text-green-900">Payment Complete</p>
                <p className="text-sm text-green-700">Thank you for your payment</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Submit Payment</h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Contact Information */}
              <div>
                <h4 className="font-medium mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={paymentData.payerName}
                      onChange={(e) => setPaymentData({ ...paymentData, payerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John Doe"
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
                      placeholder="john@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={paymentData.payerPhone}
                      onChange={(e) => setPaymentData({ ...paymentData, payerPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h4 className="font-medium mb-3">Payment Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={balance}
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Balance due: ${balance.toFixed(2)}</p>
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
                      <option value="down-payment">Down Payment (30%)</option>
                      <option value="balance">Balance Payment</option>
                      <option value="partial">Partial Payment</option>
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
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={paymentData.reference}
                      onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Transaction ID"
                    />
                  </div>

                  <div>
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

                  <div>
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
