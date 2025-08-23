// src/components/ecommerce/BusinessRegistration.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Mail, Phone, MapPin, User, ArrowLeft, 
  Factory, Wrench, Package, Users, GraduationCap, 
  Globe, ChevronRight, CheckCircle
} from 'lucide-react';

const BusinessRegistration = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Business Type Selection
    businessType: '',
    
    // Basic Information
    companyName: '',
    registrationNumber: '',
    establishedYear: '',
    
    // Contact Information
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    
    // Business Profile
    industry: '',
    companySize: '',
    annualRevenue: '',
    procurementBudget: '',
    
    // Business-specific fields
    manufacturingCapabilities: [],
    servicesOffered: [],
    productCategories: [],
    certifications: [],
    
    // Special requirements
    specialRequirements: '',
    preferredPaymentTerms: 'NET 30'
  });

  const businessTypes = [
    {
      id: 'manufacturer',
      title: 'Manufacturing Company',
      description: 'I manufacture products and need raw materials, components, or equipment',
      icon: Factory,
      benefits: ['Wholesale raw material pricing', 'Equipment financing options', 'Bulk order discounts'],
      color: 'blue'
    },
    {
      id: 'system_integrator',
      title: 'System Integrator',
      description: 'I design and integrate technical systems and solutions',
      icon: Wrench,
      benefits: ['Technical component sourcing', 'Project-based pricing', 'Engineering support'],
      color: 'green'
    },
    {
      id: 'trader',
      title: 'Trading/Distribution Company',
      description: 'I trade or distribute industrial products and equipment',
      icon: Package,
      benefits: ['Distributor pricing tiers', 'Drop-shipping options', 'Marketing support'],
      color: 'orange'
    },
    {
      id: 'consultant',
      title: 'Engineering/Consulting Firm',
      description: 'I provide engineering services and need equipment for projects',
      icon: Users,
      benefits: ['Project quotations', 'Technical specifications', 'Delivery coordination'],
      color: 'purple'
    },
    {
      id: 'government',
      title: 'Government/Institution',
      description: 'Government agency or public institution procurement',
      icon: GraduationCap,
      benefits: ['Government pricing', 'Tender support', 'Compliance documentation'],
      color: 'red'
    },
    {
      id: 'global_buyer',
      title: 'International Buyer',
      description: 'International company sourcing from Malaysia',
      icon: Globe,
      benefits: ['Export documentation', 'International shipping', 'Multi-currency pricing'],
      color: 'teal'
    }
  ];

  const industries = {
    manufacturer: ['Electronics Manufacturing', 'Automotive', 'Machinery', 'Textiles', 'Food Processing', 'Chemicals'],
    system_integrator: ['Industrial Automation', 'HVAC Systems', 'Security Systems', 'IT Infrastructure', 'Process Control'],
    trader: ['Industrial Equipment', 'Safety Products', 'Electronic Components', 'Mechanical Parts', 'Tools & Hardware'],
    consultant: ['Engineering Consulting', 'Project Management', 'Technical Services', 'R&D Services', 'Quality Assurance'],
    government: ['Public Works', 'Defense', 'Education', 'Healthcare', 'Transportation', 'Utilities'],
    global_buyer: ['Import/Export', 'International Trade', 'Global Sourcing', 'Regional Distribution']
  };

  const companySizes = [
    'Startup (1-10 employees)',
    'Small Business (11-50 employees)', 
    'Medium Enterprise (51-200 employees)',
    'Large Enterprise (201-1000 employees)',
    'Corporation (1000+ employees)'
  ];

  const malaysianStates = [
    'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Malacca', 'Negeri Sembilan',
    'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'
  ];

  const handleBusinessTypeSelect = (type) => {
    setFormData({
      ...formData,
      businessType: type,
      industry: '', // Reset industry when business type changes
      manufacturingCapabilities: [],
      servicesOffered: [],
      productCategories: []
    });
    setCurrentStep(2);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleMultiSelect = (field, value) => {
    const currentValues = formData[field] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(item => item !== value)
      : [...currentValues, value];
    
    setFormData({
      ...formData,
      [field]: newValues
    });
  };

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Import the BusinessRegistrationService
      const { default: BusinessRegistrationService } = await import('../../services/ecommerce/BusinessRegistrationService');
      
      // Submit registration
      const result = await BusinessRegistrationService.registerBusiness(formData);
      
      if (result.success) {
        // Show success message with personalized next steps
        const selectedType = businessTypes.find(bt => bt.id === formData.businessType);
        
        alert(`🎉 Registration Successful!

Business: ${formData.companyName}
Type: ${selectedType?.title}
Registration ID: ${result.registrationNumber}

Next Steps:
${result.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

Estimated verification time: ${result.estimatedVerificationTime}

You'll receive an email confirmation shortly with detailed instructions.`);
        
        // Reset form and redirect
        setCurrentStep(1);
        setFormData({
          businessType: '',
          companyName: '',
          registrationNumber: '',
          establishedYear: '',
          contactPerson: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          postcode: '',
          industry: '',
          companySize: '',
          annualRevenue: '',
          procurementBudget: '',
          manufacturingCapabilities: [],
          servicesOffered: [],
          productCategories: [],
          certifications: [],
          specialRequirements: '',
          preferredPaymentTerms: 'NET 30'
        });
        
        // Navigate to login page after delay
        setTimeout(() => {
          navigate('/business/login', { 
            state: { 
              message: 'Registration successful! Please check your email for verification instructions.',
              businessType: formData.businessType,
              registrationId: result.registrationNumber
            }
          });
        }, 2000);
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      alert(`Registration Error: ${error.message}\n\nPlease check your information and try again. If the problem persists, contact support.`);
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercent = () => {
    switch(currentStep) {
      case 1: return 25;
      case 2: return 50;
      case 3: return 75;
      case 4: return 100;
      default: return 25;
    }
  };

  // Step 1: Business Type Selection
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Catalog
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Business Registration</h1>
            <p className="text-gray-600 mt-2">Join Malaysia's leading industrial procurement platform</p>
            
            {/* Progress Bar */}
            <div className="mt-6 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercent()}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">Step 1 of 4: Select Your Business Type</p>
          </div>

          {/* Business Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {businessTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <div
                  key={type.id}
                  onClick={() => handleBusinessTypeSelect(type.id)}
                  className={`bg-white rounded-lg border-2 border-gray-200 hover:border-${type.color}-300 hover:shadow-md transition-all duration-200 cursor-pointer p-6`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-lg bg-${type.color}-100`}>
                      <IconComponent className={`w-6 h-6 text-${type.color}-600`} />
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{type.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{type.description}</p>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-700">Key Benefits:</p>
                    {type.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className={`w-4 h-4 text-${type.color}-500`} />
                        <span className="text-xs text-gray-600">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Universal Benefits */}
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">All Business Accounts Include:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800">Wholesale pricing access</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800">Flexible payment terms</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800">Dedicated account manager</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-800">Priority technical support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Steps 2-4: Registration Form
  const selectedBusinessType = businessTypes.find(bt => bt.id === formData.businessType);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setCurrentStep(1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Change Business Type
          </button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 rounded-lg bg-${selectedBusinessType.color}-100`}>
              <selectedBusinessType.icon className={`w-5 h-5 text-${selectedBusinessType.color}-600`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedBusinessType.title} Registration</h1>
              <p className="text-gray-600">{selectedBusinessType.description}</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercent()}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Step {currentStep} of 4: {currentStep === 2 ? 'Company Information' : currentStep === 3 ? 'Contact Details' : 'Business Profile'}
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Step 2: Company Information */}
            {currentStep === 2 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      Company Name *
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Registration Number *
                    </label>
                    <input
                      type="text"
                      name="registrationNumber"
                      value={formData.registrationNumber}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="SSM Registration Number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year Established *
                    </label>
                    <input
                      type="number"
                      name="establishedYear"
                      value={formData.establishedYear}
                      onChange={handleChange}
                      required
                      min="1900"
                      max={new Date().getFullYear()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="2010"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Industry *
                    </label>
                    <select
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Primary Industry</option>
                      {industries[formData.businessType]?.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={!formData.companyName || !formData.registrationNumber || !formData.establishedYear || !formData.industry}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Contact Details */}
            {currentStep === 3 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Full name of contact person"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Business Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="business@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+60 3-xxxx xxxx"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select State</option>
                      {malaysianStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Business Address *
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      rows="2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Complete business address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postcode *
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12345"
                    />
                  </div>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    disabled={!formData.contactPerson || !formData.email || !formData.phone || !formData.address || !formData.state || !formData.postcode}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {/* Step 4: Business Profile */}
            {currentStep === 4 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Size *
                    </label>
                    <select
                      name="companySize"
                      value={formData.companySize}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Company Size</option>
                      {companySizes.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Annual Procurement Budget
                    </label>
                    <select
                      name="procurementBudget"
                      value={formData.procurementBudget}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Budget Range</option>
                      <option value="under_100k">Under RM 100,000</option>
                      <option value="100k_500k">RM 100,000 - RM 500,000</option>
                      <option value="500k_1m">RM 500,000 - RM 1,000,000</option>
                      <option value="1m_5m">RM 1,000,000 - RM 5,000,000</option>
                      <option value="above_5m">Above RM 5,000,000</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Payment Terms
                    </label>
                    <select
                      name="preferredPaymentTerms"
                      value={formData.preferredPaymentTerms}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="NET 30">NET 30 Days</option>
                      <option value="NET 60">NET 60 Days</option>
                      <option value="NET 90">NET 90 Days</option>
                      <option value="COD">Cash on Delivery</option>
                      <option value="Advance">Advance Payment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Requirements or Notes
                  </label>
                  <textarea
                    name="specialRequirements"
                    value={formData.specialRequirements}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any specific requirements, certifications needed, or additional information..."
                  />
                </div>

                {/* Terms and Conditions */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      required 
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-700">
                      I agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and 
                      <a href="/privacy" className="text-blue-600 hover:underline ml-1">Privacy Policy</a>. 
                      I consent to the processing of my business data for account setup and service delivery.
                    </label>
                  </div>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.companySize || isLoading}
                    className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors font-medium flex items-center justify-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing Registration...
                      </>
                    ) : (
                      'Complete Registration'
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Selected Business Type Summary */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Registering as: <span className="font-medium text-gray-700">{selectedBusinessType.title}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            You can modify your business profile after registration if needed
          </p>
        </div>
      </div>
    </div>
  );
};

export default BusinessRegistration;
