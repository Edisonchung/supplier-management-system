// src/components/admin/CompanyStructureManager.jsx
// Admin Panel for Managing Multi-Company Structure

import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Users,
  Crown,
  Shield,
  Eye,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  TrendingUp,
  Globe
} from 'lucide-react';
import companyManagementService from '../../services/companyManagementService';
import { usePermissions } from '../../hooks/usePermissions';

const CompanyStructureManager = () => {
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [initializationStatus, setInitializationStatus] = useState(null);

  const permissions = usePermissions();

  useEffect(() => {
    loadData();
    checkInitialization();
  }, []);

  const checkInitialization = async () => {
    try {
      const isInit = await companyManagementService.isInitialized();
      setInitialized(isInit);
    } catch (error) {
      console.error('Error checking initialization:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [companiesData, branchesData, statsData] = await Promise.all([
        companyManagementService.getAllCompanies(),
        companyManagementService.getAllBranches(),
        companyManagementService.getCompanyStatistics()
      ]);

      setCompanies(companiesData);
      setBranches(branchesData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeSystem = async () => {
    try {
      setLoading(true);
      setInitializationStatus('Initializing company structure...');
      
      const result = await companyManagementService.initializeCompanyStructure();
      
      if (result.success) {
        setInitializationStatus(`✅ Successfully initialized ${result.companiesCreated} companies and ${result.branchesCreated} branches`);
        setInitialized(true);
        await loadData();
      } else {
        setInitializationStatus('❌ Initialization failed');
      }
    } catch (error) {
      console.error('Error initializing system:', error);
      setInitializationStatus('❌ Initialization error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMigratePOs = async () => {
    try {
      setLoading(true);
      const result = await companyManagementService.migratePurchaseOrders();
      
      if (result.success) {
        alert(`✅ Successfully migrated ${result.migratedCount} Purchase Orders`);
        await loadData();
      } else {
        alert('❌ Migration failed: ' + result.error);
      }
    } catch (error) {
      console.error('Error migrating POs:', error);
      alert('❌ Migration error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Overview Tab Component
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* System Status */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
            initialized ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {initialized ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Initialized
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4" />
                Not Initialized
              </>
            )}
          </div>
        </div>

        {!initialized && (
          <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">System Not Initialized</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  The multi-company structure needs to be initialized before you can manage companies and branches.
                </p>
                <button
                  onClick={handleInitializeSystem}
                  disabled={loading}
                  className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Initializing...' : 'Initialize System'}
                </button>
              </div>
            </div>
          </div>
        )}

        {initializationStatus && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">{initializationStatus}</p>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-600">Companies</p>
                  <p className="text-2xl font-bold text-blue-900">{statistics.totalCompanies}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-600">Branches</p>
                  <p className="text-2xl font-bold text-green-900">{statistics.totalBranches}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-purple-600">Purchase Orders</p>
                  <p className="text-2xl font-bold text-purple-900">{statistics.totalPurchaseOrders}</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-orange-600">Categories</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {Object.keys(statistics.companiesByCategory).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => setShowAddCompany(true)}
            disabled={!initialized}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-5 h-5 text-blue-600" />
            <span className="font-medium">Add Company</span>
          </button>

          <button
            onClick={() => setShowAddBranch(true)}
            disabled={!initialized}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-5 h-5 text-green-600" />
            <span className="font-medium">Add Branch</span>
          </button>

          <button
            onClick={handleMigratePOs}
            disabled={!initialized || loading}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-5 h-5 text-purple-600" />
            <span className="font-medium">Migrate POs</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            <span className="font-medium">Refresh Data</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Companies Tab Component
  const CompaniesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Companies</h3>
        <button
          onClick={() => setShowAddCompany(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companies.map(company => (
          <div key={company.id} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-gray-900">{company.name}</h4>
                  <p className="text-sm text-gray-600">{company.code}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 text-gray-400 hover:text-blue-600">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1 text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="font-medium">{company.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Region:</span>
                <span className="font-medium">{company.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Branches:</span>
                <span className="font-medium">
                  {branches.filter(b => b.companyId === company.id).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">POs:</span>
                <span className="font-medium">
                  {statistics?.posByCompany[company.id] || 0}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                company.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {company.status || 'Active'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Branches Tab Component
  const BranchesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Branches</h3>
        <button
          onClick={() => setShowAddBranch(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Branch
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map(branch => {
          const company = companies.find(c => c.id === branch.companyId);
          return (
            <div key={branch.id} className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-green-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{branch.name}</h4>
                    <p className="text-sm text-gray-600">{company?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 text-gray-400 hover:text-blue-600">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{branch.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Manager:</span>
                  <span className="font-medium">{branch.manager}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{branch.phone}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-600">{branch.address}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (!permissions.canManageCompanies && !permissions.isGroupAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to manage company structure.</p>
      </div>
    );
  }

  if (loading && !statistics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading company structure...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Structure Manager</h1>
          <p className="text-gray-600">Manage companies, branches, and admin assignments</p>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
          <Crown className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-800">{permissions.userBadge}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'companies', label: 'Companies', icon: Building2 },
            { id: 'branches', label: 'Branches', icon: MapPin },
            { id: 'permissions', label: 'Permissions', icon: Users }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'companies' && <CompaniesTab />}
      {activeTab === 'branches' && <BranchesTab />}
      {activeTab === 'permissions' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions Management</h3>
          <p className="text-gray-600">Permissions management interface coming soon...</p>
        </div>
      )}
    </div>
  );
};

export default CompanyStructureManager;
