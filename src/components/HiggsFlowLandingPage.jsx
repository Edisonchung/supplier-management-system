import React, { useState, useEffect } from 'react';
import { ArrowRight, Building2, ShoppingCart, BarChart3, Zap, Star, Users, Globe, CheckCircle, Play, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { higgsFlowAnalytics } from '../services/analyticsService';

const HiggsFlowLandingPage = () => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    // Track landing page visit
    const trackLandingPageVisit = async () => {
      try {
        await higgsFlowAnalytics.trackUserSession({
          entryPoint: 'landing_page',
          landingPage: '/',
          userAgent: navigator.userAgent,
          referrer: document.referrer
        });
      } catch (error) {
        console.error('Error tracking landing page visit:', error);
      }
    };

    trackLandingPageVisit();
  }, []);

  const testimonials = [
    {
      company: "Petronas Refinery",
      logo: "🏭",
      quote: "HiggsFlow transformed our procurement process. We reduced sourcing time by 60% and found better suppliers through their AI recommendations.",
      author: "Ahmad Rahman",
      title: "Procurement Manager",
      industry: "Oil & Gas"
    },
    {
      company: "Intel Malaysia",
      logo: "💻",
      quote: "The smart catalog understands our semiconductor needs perfectly. The personalized recommendations have saved us millions in procurement costs.",
      author: "Sarah Chen",
      title: "Supply Chain Director", 
      industry: "Semiconductor"
    },
    {
      company: "Sime Darby Plantation",
      logo: "🌱",
      quote: "Finally, an e-commerce platform built for industrial needs. The factory identification feature automatically shows us relevant equipment.",
      author: "Rajesh Kumar",
      title: "Operations Head",
      industry: "Palm Oil"
    }
  ];

  const stats = [
    { number: "500+", label: "Industrial Suppliers", icon: "🏭" },
    { number: "50,000+", label: "Products Available", icon: "📦" },
    { number: "127", label: "Active Factories", icon: "⚡" },
    { number: "RM 850M", label: "Platform GMV", icon: "💰" }
  ];

  const features = [
    {
      icon: "🧠",
      title: "AI-Powered Recommendations",
      description: "Our advanced AI understands your industry and suggests the perfect products for your factory's needs."
    },
    {
      icon: "🏭",
      title: "Factory Intelligence",
      description: "Automatic factory identification and personalized catalog based on your industry and location."
    },
    {
      icon: "📊",
      title: "Smart Analytics",
      description: "Real-time insights into procurement patterns, cost optimization, and supply chain efficiency."
    },
    {
      icon: "🎯",
      title: "Targeted Sourcing",
      description: "Find suppliers and products specifically relevant to your industrial sector and requirements."
    },
    {
      icon: "⚡",
      title: "Instant Quotes",
      description: "Get competitive quotes from multiple suppliers instantly, with AI-powered price comparisons."
    },
    {
      icon: "🔒",
      title: "Enterprise Security",
      description: "Bank-grade security with role-based access control and comprehensive audit trails."
    }
  ];

  const handleCTAClick = (action) => {
    // Track CTA clicks
    higgsFlowAnalytics.trackProductInteraction({
      productId: 'landing_page_cta',
      action: 'cta_click',
      searchQuery: action
    });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">HF</span>
                </div>
                <div>
                  <span className="text-2xl font-bold text-gray-900">HiggsFlow</span>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2">Phase 2B</span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">Features</a>
              <a href="#industries" className="text-gray-600 hover:text-gray-900 font-medium">Industries</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 font-medium">Testimonials</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 font-medium">Contact</a>
              
              <div className="flex items-center space-x-4">
                {user ? (
                  <a 
                    href={user.email?.includes('higgsflow.com') ? '/admin' : '/factory/dashboard'}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Go to Dashboard
                  </a>
                ) : (
                  <>
                    <a 
                      href="/factory/login" 
                      className="text-gray-600 hover:text-gray-900 font-medium"
                      onClick={() => handleCTAClick('factory_login')}
                    >
                      Factory Login
                    </a>
                    <a 
                      href="/catalog" 
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      onClick={() => handleCTAClick('browse_catalog')}
                    >
                      Browse Catalog
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 pt-2 pb-3 space-y-1">
              <a href="#features" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Features</a>
              <a href="#industries" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Industries</a>
              <a href="#testimonials" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Testimonials</a>
              <a href="#contact" className="block px-3 py-2 text-gray-600 hover:text-gray-900">Contact</a>
              <div className="pt-2 space-y-2">
                {user ? (
                  <a 
                    href={user.email?.includes('higgsflow.com') ? '/admin' : '/factory/dashboard'}
                    className="block bg-blue-600 text-white px-3 py-2 rounded-lg font-medium text-center"
                  >
                    Go to Dashboard
                  </a>
                ) : (
                  <>
                    <a href="/factory/login" className="block text-center px-3 py-2 text-gray-600">Factory Login</a>
                    <a href="/catalog" className="block bg-blue-600 text-white px-3 py-2 rounded-lg font-medium text-center">Browse Catalog</a>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="mb-6">
                <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                  🚀 Malaysia's Most Advanced Industrial E-commerce Platform
                </span>
              </div>
              
              <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                Revolutionize Your <span className="text-blue-600">Industrial Procurement</span> with AI
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                HiggsFlow connects Malaysian factories with the right suppliers using advanced AI, 
                personalized recommendations, and intelligent analytics. Reduce costs, save time, 
                and optimize your supply chain like never before.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="/catalog" 
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
                  onClick={() => handleCTAClick('hero_browse_catalog')}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Browse Smart Catalog
                </a>
                <a 
                  href="/factory/register" 
                  className="border border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center"
                  onClick={() => handleCTAClick('hero_register_factory')}
                >
                  <Building2 className="w-5 h-5 mr-2" />
                  Register Your Factory
                </a>
              </div>
              
              <div className="mt-8 flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Free to browse</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>AI-powered matching</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Instant quotes</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Live Platform Stats</span>
                    <span className="flex items-center text-green-600 text-sm">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                      Real-time
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {stats.map((stat, index) => (
                      <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl mb-1">{stat.icon}</div>
                        <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                        <div className="text-sm text-gray-600">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-center text-sm text-gray-600">
                      <span className="font-medium text-blue-600">89% of factories</span> find better suppliers through our AI
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why HiggsFlow is Malaysia's #1 Industrial Platform
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We've revolutionized industrial procurement with cutting-edge AI technology, 
              giving you insights and efficiency that traditional suppliers simply can't match.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Serving Malaysia's Leading Industries
            </h2>
            <p className="text-xl text-gray-600">
              From oil & gas to semiconductors, we understand the unique needs of every industrial sector.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { name: "Oil & Gas", icon: "⚡", companies: "Petronas, Shell, ExxonMobil" },
              { name: "Semiconductor", icon: "💻", companies: "Intel, Infineon, OSRAM" },
              { name: "Palm Oil", icon: "🌱", companies: "Sime Darby, IOI, Genting" },
              { name: "Automotive", icon: "🚗", companies: "Proton, Perodua, Honda" },
              { name: "Manufacturing", icon: "🏭", companies: "Genting, Public Bank, Maybank" },
              { name: "Electronics", icon: "📱", companies: "Panasonic, Sony, Samsung" },
              { name: "Construction", icon: "🏗️", companies: "Gamuda, IJM, WCT" },
              { name: "Logistics", icon: "🚛", companies: "MMC, Westports, MISC" }
            ].map((industry, index) => (
              <div key={index} className="text-center p-6 bg-white rounded-xl hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{industry.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{industry.name}</h3>
                <p className="text-sm text-gray-600">{industry.companies}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Trusted by Malaysia's Largest Factories
            </h2>
            <p className="text-xl text-gray-600">
              See how leading industrial companies are transforming their procurement with HiggsFlow.
            </p>
          </div>
          
          <div className="relative">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {testimonials.map((testimonial, index) => (
                  <div 
                    key={index} 
                    className={`bg-white rounded-xl p-6 shadow-md transition-all ${
                      index === activeTestimonial ? 'ring-2 ring-blue-500 scale-105' : ''
                    }`}
                  >
                    <div className="flex items-center mb-4">
                      <span className="text-2xl mr-3">{testimonial.logo}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900">{testimonial.company}</h4>
                        <span className="text-sm text-blue-600">{testimonial.industry}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-4 italic">"{testimonial.quote}"</p>
                    
                    <div className="border-t border-gray-200 pt-4">
                      <p className="font-medium text-gray-900">{testimonial.author}</p>
                      <p className="text-sm text-gray-600">{testimonial.title}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-center mt-8 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTestimonial(index)}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      index === activeTestimonial ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Procurement?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join 127+ Malaysian factories already saving time and money with HiggsFlow's AI-powered platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/catalog" 
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center"
              onClick={() => handleCTAClick('cta_browse_catalog')}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Start Browsing Now
            </a>
            <a 
              href="/factory/register" 
              className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors flex items-center justify-center"
              onClick={() => handleCTAClick('cta_register_factory')}
            >
              <Building2 className="w-5 h-5 mr-2" />
              Register Your Factory
            </a>
          </div>
          
          <div className="mt-8 text-blue-100 text-sm">
            <span>🎯 Free to browse • 🤖 AI-powered • ⚡ Instant quotes • 🔒 Secure platform</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">HF</span>
                </div>
                <span className="text-2xl font-bold">HiggsFlow</span>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Malaysia's most advanced industrial e-commerce platform, connecting factories 
                with suppliers through AI-powered intelligence and real-time analytics.
              </p>
              <div className="text-gray-400 text-sm">
                <p>📍 Kuala Lumpur, Malaysia</p>
                <p>📧 hello@higgsflow.com</p>
                <p>📞 +60 3-1234-5678</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/catalog" className="hover:text-white transition-colors">Browse Catalog</a></li>
                <li><a href="/factory/register" className="hover:text-white transition-colors">Register Factory</a></li>
                <li><a href="/factory/login" className="hover:text-white transition-colors">Factory Login</a></li>
                <li><a href="/admin" className="hover:text-white transition-colors">Admin Portal</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 HiggsFlow. All rights reserved. Made with ❤️ in Malaysia.
            </p>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <span className="text-sm text-gray-400">Phase 2B • Advanced Analytics</span>
              <div className="flex items-center text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                System Online
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HiggsFlowLandingPage;
