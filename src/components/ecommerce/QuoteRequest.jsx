
// src/components/ecommerce/QuoteRequest.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Plus, 
  Minus, 
  Building2, 
  Mail, 
  Phone, 
  MessageSquare,
  Calculator,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Paperclip,
  X,
  Loader2
} from 'lucide-react';

const QuoteRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get product from navigation state or initialize empty
  const initialProduct = location.state?.product || null;
  
  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    
    // Quote Details
    projectName: '',
    deliveryLocation: '',
    requestedDeliveryDate: '',
    paymentTerms: 'NET 30',
    specialRequirements: ''
  });

  const [quoteItems, setQuoteItems] = useState(
    initialProduct ? [{
      id: Date.now(),
      productName: initialProduct.displayName || initialProduct.name || '',
      specifications: '',
      quantity: 1,
      unit: 'pcs',
      estimatedPrice: initialProduct.pricing?.unitPrice || '',
      notes: ''
    }] : [{
      id: Date.now(),
      productName: '',
      specifications: '',
      quantity: 1,
      unit: 'pcs',
      estimatedPrice: '',
      notes: ''
    }]
  );

  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (id, field, value) => {
    setQuoteItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addQuoteItem = () => {
    setQuoteItems(prev => [...prev, {
      id: Date.now(),
      productName: '',
      specifications: '',
      quantity: 1,
      unit: 'pcs',
      estimatedPrice: '',
      notes: ''
    }]);
  };

  const removeQuoteItem = (id) => {
    setQuoteItems(prev => prev.filter(item => item.id !== id));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Quote Request Data:', {
        formData,
        quoteItems,
        attachments: attachments.map(f => f.name)
      });
      
      setSubmitted(true);
    } catch (error) {
      alert('Error submitting quote request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quote Request Submitted!</h2>
          <p className="text-gray-600 mb-6">
            We've received your quote request and will respond within 24 hours.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/catalog')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => navigate('/factory/register')}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50"
            >
              Create Factory Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Request Quote</h1>
          <p className="text-gray-600">Get customized pricing for your industrial needs</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Quote Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Quote Items
              </h2>
              <button
                type="button"
                onClick={addQuoteItem}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
            
            <div className="space-y-4">
              {quoteItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium text-gray-900">Item {index + 1}</h3>
                    {quoteItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuoteItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specifications & Requirements
                    </label>
                    <textarea
                      value={item.specifications}
                      onChange={(e) => handleItemChange(item.id, 'specifications', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe technical specifications, quality requirements, standards, etc."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Submit Quote Request
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteRequest;
