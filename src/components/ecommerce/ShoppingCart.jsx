// src/components/ecommerce/ShoppingCart.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingCart as CartIcon, 
  Plus, 
  Minus, 
  Trash2, 
  Heart,
  Calculator,
  Truck,
  CheckCircle,
  AlertCircle,
  CreditCard,
  User,
  LogIn
} from 'lucide-react';

const ShoppingCart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId] = useState(() => {
    return sessionStorage.getItem('guest_session_id') || 
           'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  });

  // Mock cart data for demonstration
  useEffect(() => {
    const mockCartData = [
      {
        id: 'cart_item_1',
        productId: 'product_123',
        productName: 'Industrial Steel Pipe DN50',
        productImage: '/api/placeholder/100/100',
        supplierName: 'Steel Components Malaysia',
        unitPrice: 125.50,
        quantity: 10,
        totalPrice: 1255.00,
        stockStatus: 'in_stock',
        deliveryTime: '5-7 days',
        specifications: {
          material: 'Carbon Steel',
          diameter: '50mm',
          length: '6m'
        }
      },
      {
        id: 'cart_item_2',
        productId: 'product_456',
        productName: 'Hydraulic Valve Assembly',
        productImage: '/api/placeholder/100/100',
        supplierName: 'Precision Engineering Sdn Bhd',
        unitPrice: 850.00,
        quantity: 2,
        totalPrice: 1700.00,
        stockStatus: 'limited_stock',
        deliveryTime: '3-5 days',
        specifications: {
          pressure: '200 bar',
          size: '1/2 inch',
          material: 'Stainless Steel'
        }
      }
    ];

    // Simulate loading
    setTimeout(() => {
      setCartItems(mockCartData);
      setLoading(false);
    }, 1000);
  }, []);

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCartItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
          : item
      )
    );
  };

  const removeItem = (itemId) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CartIcon className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading your cart...</p>
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
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-600">{getCartCount()} items in your cart</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {cartItems.length === 0 ? (
          // Empty Cart
          <div className="text-center py-12">
            <CartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Discover our industrial products and start building your order</p>
            <button 
              onClick={() => navigate('/catalog')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          // Cart with Items
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Cart Items</h2>
                </div>
                
                <div className="divide-y">
                  {cartItems.map((item) => (
                    <div key={item.id} className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 mb-1">
                                {item.productName}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                Supplier: {item.supplierName}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Truck className="w-4 h-4" />
                                  {item.deliveryTime}
                                </span>
                                <span className="flex items-center gap-1">
                                  {item.stockStatus === 'in_stock' ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                      In Stock
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="w-4 h-4 text-orange-500" />
                                      Limited Stock
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-2 text-gray-400 hover:text-red-500"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 text-gray-400 hover:text-red-500"
                                title="Save for later"
                              >
                                <Heart className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Specifications */}
                          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                            {Object.entries(item.specifications).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-gray-500 capitalize">{key}:</span>
                                <span className="ml-1 text-gray-900">{value}</span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Quantity and Price */}
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-600">Quantity:</span>
                              <div className="flex items-center border rounded-lg">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="p-2 hover:bg-gray-50"
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-4 py-2 min-w-[3rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="p-2 hover:bg-gray-50"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-sm text-gray-600">
                                RM {item.unitPrice.toFixed(2)} each
                              </div>
                              <div className="text-lg font-semibold text-gray-900">
                                RM {item.totalPrice.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Cart Summary */}
            <div className="lg:col-span-1 mt-8 lg:mt-0">
              <div className="bg-white rounded-lg shadow-sm sticky top-4">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal ({getCartCount()} items)</span>
                      <span className="text-gray-900">RM {getCartTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estimated Shipping</span>
                      <span className="text-gray-900">Calculated at checkout</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="text-gray-900">Calculated at checkout</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>RM {getCartTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Guest Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                          Register for Better Pricing
                        </h4>
                        <p className="text-sm text-blue-700 mb-3">
                          Factory accounts get wholesale pricing and credit terms
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate('/factory/register')}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                          >
                            Register
                          </button>
                          <button
                            onClick={() => navigate('/factory/login')}
                            className="text-xs border border-blue-600 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-50"
                          >
                            Sign In
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate('/quote/request')}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Calculator className="w-4 h-4" />
                      Request Quote
                    </button>
                    <button
                      onClick={() => alert('Checkout feature coming soon!')}
                      className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Proceed to Checkout
                    </button>
                  </div>
                  
                  <div className="mt-4 text-center text-xs text-gray-500">
                    Secure checkout powered by HiggsFlow
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingCart;
