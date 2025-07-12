// src/components/migration/MigrationPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Cloud, 
  Database, 
  Users, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  ArrowLeft,
  Zap,
  Shield,
  Globe,
  TrendingUp,
  Clock,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUnifiedData } from '../../context/UnifiedDataContext';

const MigrationPage = () => {
  const navigate = useNavigate();
  const { dataSource, migrateToFirestore, isRealTimeActive } = useUnifiedData();
  
  const [migrationStatus, setMigrationStatus] = useState({
    suppliers: { status: 'pending', count: 0 },
    products: { status: 'pending', count: 0 },
    purchaseOrders: { status: 'pending', count: 0 },
    deliveryTracking: { status: 'pending', count: 0 },
    paymentTracking: { status: 'pending', count: 0 }
  });
  
  const [isMigrating, setIsMigrating] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const benefits = [
    {
      icon: Users,
      title: 'Real-time Team Collaboration',
      description: 'Multiple team members can update tracking status simultaneously without conflicts',
      impact: 'Reduce coordination overhead by 80%'
    },
    {
      icon: Smartphone,
      title: 'Cross-Device Synchronization',
      description: 'Start work on desktop, continue on mobile - all changes sync instantly across devices',
      impact: 'Enable mobile field operations'
    },
    {
      icon: Shield,
      title: 'Enterprise Data Security',
      description: 'Professional backup, disaster recovery, and enterprise-grade security included',
      impact: 'Zero data loss risk'
    },
    {
      icon: Globe,
      title: 'Global Team Support',
      description: 'Teams across different time zones and locations can collaborate seamlessly',
      impact: 'Support distributed operations'
    },
    {
      icon: Zap,
      title: 'Instant Performance',
      description: 'Optimistic updates provide immediate feedback while syncing in the background',
      impact: 'Faster user experience'
    },
    {
      icon: TrendingUp,
      title: 'Advanced Analytics Ready',
      description: 'Foundation for real-time reporting, predictive analytics, and business intelligence',
      impact: 'Enable data-driven decisions'
    }
  ];

  const migrationSteps = [
    {
      step: 1,
      title: 'Review Benefits',
      description: 'Understand the advantages of real-time collaboration',
      icon: Database
    },
    {
      step: 2,
      title: 'Data Assessment',
      description: 'Review your current data before migration',
      icon: CheckCircle
    },
    {
      step: 3,
      title: 'Safe Migration',
      description: 'Migrate data with zero downtime and full backup',
      icon: Cloud
    },
    {
      step: 4,
      title: 'Verification',
      description: 'Confirm migration success and test features',
      icon: Shield
    }
  ];

  // Get current data counts from localStorage
  useEffect(() => {
    const updateCounts = () => {
      try {
        const deliveryData = JSON.parse(localStorage.getItem('higgsflow_deliveryTracking') || '{}');
        const paymentData = JSON.parse(localStorage.getItem('higgsflow_paymentTracking') || '{}');
        const supplierData = JSON.parse(localStorage.getItem('higgsflow_suppliers') || '[]');
        const productData = JSON.parse(localStorage.getItem('higgsflow_products') || '[]');
        const poData = JSON.parse(localStorage.getItem('higgsflow_purchaseOrders') || '[]');
        
        setMigrationStatus(prev => ({
          ...prev,
          suppliers: { ...prev.suppliers, count: supplierData.length },
          products: { ...prev.products, count: productData.length },
          purchaseOrders: { ...prev.purchaseOrders, count: poData.length },
          deliveryTracking: { ...prev.deliveryTracking, count: Object.keys(deliveryData).length },
          paymentTracking: { ...prev.paymentTracking, count: Object.keys(paymentData).length }
        }));
      } catch (error) {
        console.error('Failed to count localStorage data:', error);
      }
    };
    
    updateCounts();
  }, []);

  const handleFullMigration = async () => {
    setIsMigrating(true);
    setCurrentStep(3);
    
    try {
      toast.loading('Starting safe migration to Firestore...', { id: 'migration' });
      
      // Simulate step progression for better UX
      setTimeout(() => setCurrentStep(4), 2000);
      
      const result = await migrateToFirestore();
      
      if (result.success) {
        // Update all collections as completed
        setMigrationStatus(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            updated[key] = { ...updated[key], status: 'completed' };
          });
          return updated;
        });
        
        toast.success(`🎉 Migration completed! ${result.migrated} items moved to Firestore`, { id: 'migration' });
        
        // Auto-redirect to tracking dashboard after success
        setTimeout(() => {
          navigate('/tracking');
        }, 3000);
        
      } else {
        throw new Error(result.error || 'Migration failed');
      }
      
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error(`Migration failed: ${error.message}`, { id: 'migration' });
      setCurrentStep(2); // Go back to data assessment
    } finally {
      setIsMigrating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'migrating': return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  const getTotalItems = () => {
    return Object.values(migrationStatus).reduce((sum, item) => sum + item.count, 0);
  };

  // If already migrated, show success page
  if (dataSource === 'firestore') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center p-8">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎉 Migration Complete!
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">
            Your tracking system is now using real-time cloud storage with cross-device synchronization.
            {isRealTimeActive && " Real-time updates are active!"}
          </p>
          
          <div className="bg-white rounded-lg p-6 mb-8 text-left">
            <h3 className="text-lg font-semibold mb-4">✨ What's New:</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Real-time collaboration across all devices
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Mobile field operations enabled
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Professional data backup and security
              </li>
              <li className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                Foundation for advanced analytics
              </li>
            </ul>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/tracking')}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open Tracking Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
            
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              
              <div>
                <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Cloud className="h-6 w-6 text-blue-600 mr-2" />
                  Firestore Migration
                </h1>
                <p className="text-sm text-gray-600">
                  Upgrade to real-time collaboration
                </p>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Step {currentStep} of {migrationSteps.length}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          {migrationSteps.map((step, index) => (
            <div key={step.step} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep >= step.step 
                  ? 'bg-blue-600 border-blue-600 text-white' 
                  : 'border-gray-300 text-gray-400'
              }`}>
                <step.icon className="h-5 w-5" />
              </div>
              
              <div className="ml-3 hidden sm:block">
                <p className={`text-sm font-medium ${
                  currentStep >= step.step ? 'text-blue-600' : 'text-gray-400'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              
              {index < migrationSteps.length - 1 && (
                <div className={`w-16 h-0.5 ml-4 ${
                  currentStep > step.step ? 'bg-blue-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Benefits */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Why Upgrade to Real-Time Collaboration?
              </h2>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 border border-gray-200">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <benefit.icon className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {benefit.title}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          {benefit.description}
                        </p>
                        <p className="text-sm font-medium text-blue-600">
                          Impact: {benefit.impact}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Status */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Current System Status
              </h2>
              
              <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Data Storage</h3>
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                    Local Only
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-semibold">{getTotalItems()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Collaboration:</span>
                    <span className="text-red-600">Single User Only</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Mobile Access:</span>
                    <span className="text-red-600">Limited</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Backup:</span>
                    <span className="text-red-600">Manual Only</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue to Data Assessment
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Data Assessment
            </h2>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200 mb-8">
              <h3 className="text-lg font-semibold mb-4">Items to Migrate</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {Object.entries(migrationStatus).map(([key, status]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      {getStatusIcon(status.status)}
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {status.count}
                    </p>
                    <p className="text-sm text-gray-600">items</p>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">
                      Migration Safety Guarantee
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Your localStorage data will be preserved as backup</li>
                      <li>• Zero downtime - continue working during migration</li>
                      <li>• Full rollback capability if needed</li>
                      <li>• Data integrity verification included</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Benefits
              </button>
              
              <button
                onClick={handleFullMigration}
                disabled={isMigrating || getTotalItems() === 0}
                className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Migrating...
                  </>
                ) : (
                  <>
                    Start Safe Migration
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <RefreshCw className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Migration in Progress
              </h2>
              <p className="text-gray-600">
                Safely migrating your data to Firestore with zero downtime...
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="space-y-3">
                {Object.entries(migrationStatus).map(([key, status]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">
                        {status.count} items
                      </span>
                      {getStatusIcon('migrating')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && !isMigrating && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Verifying Migration
              </h2>
              <p className="text-gray-600">
                Confirming data integrity and testing real-time features...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MigrationPage;
